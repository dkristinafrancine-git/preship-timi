import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";

/**
 * Platform-admin (superadmin) authz for the /admin console + /api/admin/*.
 *
 * The superadmin role is **not** self-assigned or promoted from a UI. It is
 * bootstrapped from the `ADMIN_EMAILS` env allowlist (comma-separated) at
 * sign-in — `ensureAdminRole()` runs in the NextAuth `jwt` callback so a user
 * whose email is allowlisted is upgraded to role=superadmin on their session.
 * After that the role lives on the User row and is the source of truth.
 *
 * Defense in depth (per AGENT.md security rules): the edge middleware gates
 * /admin + /api/admin against a bare session, AND every handler re-checks with
 * `requireAdmin()`. Never trust the route alone.
 */

export const ADMIN_ROLE = "superadmin";
export const MEMBER_ROLE = "member";

/** Parsed (lowercased, trimmed) set of allowlisted admin emails. Empty when
 *  ADMIN_EMAILS is unset — nobody is auto-promoted in that case. */
export function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.trim().toLowerCase());
}

/** True if the row carries the superadmin role. */
export function isSuperadmin(user: { role?: string | null } | null): boolean {
  return !!user && user.role === ADMIN_ROLE;
}

/**
 * Run inside the NextAuth `jwt` callback. If the signed-in user's email is on
 * the ADMIN_EMAILS allowlist but their row isn't yet superadmin, upgrade it
 * (one-time bootstrap). Also surfaces the role onto the token so the client
 * can show/hide the admin entry point without an extra round-trip.
 *
 * Returns the role that should be written to the token. Cheap: only writes
 * when the allowlist matches AND the stored role differs.
 */
export async function ensureAdminRole(opts: {
  userId: string;
  email: string;
}): Promise<string> {
  const allow = adminEmails();
  if (allow.size === 0) return MEMBER_ROLE;
  if (!allow.has(opts.email.trim().toLowerCase())) return MEMBER_ROLE;

  // Only write when the row isn't already superadmin — avoid a write per token
  // refresh. Read the current role first; the role column predates this code
  // for existing rows (default "member"), so a null/missing read is safe to
  // treat as "needs upgrade".
  const row = await db.user.findUnique({
    where: { id: opts.userId },
    select: { role: true },
  });
  if (row?.role === ADMIN_ROLE) return ADMIN_ROLE;

  await db.user.update({
    where: { id: opts.userId },
    data: { role: ADMIN_ROLE },
  });
  return ADMIN_ROLE;
}

/**
 * Handler-side guard for /api/admin/*. Returns the authenticated superadmin
 * on success, or a NextResponse (401/403) to return immediately on failure.
 *
 * Usage:
 *   const guard = await requireAdmin();
 *   if (guard instanceof NextResponse) return guard;
 *   const admin = guard; // CurrentUser with role === "superadmin"
 */
export async function requireAdmin(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No current user" }, { status: 401 });
  }
  if (!isSuperadmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

/** Type guard convenience for callers that already have the user. */
export function denyUnlessAdmin(user: CurrentUser | null): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "No current user" }, { status: 401 });
  }
  if (!isSuperadmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Active-vs-passive window. A user is "active" if seen within this many days.
 * Configurable per-call (the console exposes a 7d/30d toggle); default 7.
 */
export function isActive(lastSeenAt: Date | string | null, days = 7): boolean {
  if (!lastSeenAt) return false;
  const ts = typeof lastSeenAt === "string" ? Date.parse(lastSeenAt) : lastSeenAt.getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
}

/** Midnight-UTC cutoff timestamp for the active window — handy for DB queries
 *  (cheaper than computing per-row in JS). Returns a Date `days` ago. */
export function activeSince(days = 7): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
