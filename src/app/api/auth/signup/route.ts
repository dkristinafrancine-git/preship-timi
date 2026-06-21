import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9-]{3,20}$/;

/**
 * POST /api/auth/signup
 *
 * Creates a new founder account.
 * Body: { email, password, name, handle }
 *
 * Validation:
 * - email: must match a basic email regex
 * - password: >= 6 chars
 * - name: non-empty after trim
 * - handle: 3-20 chars, alphanumeric + dash only, lowercase, unique
 *
 * On success returns 201 with `{ user: { id, email, name, handle } }`.
 * The new user is created with `onboarded: false` and an empty `title`
 * (filled in during onboarding). `isCurrent` is left at its default
 * (false) — the NextAuth session handles the "current user" concept.
 *
 * After signup the client calls `signIn("credentials", { email, password })`
 * and the credentials provider in src/lib/auth.ts will verify the password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password, name, handle, inviteToken } = body as Record<string, unknown>;

    // --- Validate email ---
    if (typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const emailNorm = email.trim().toLowerCase();
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // --- Validate password ---
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // --- Validate name ---
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const nameTrim = name.trim();

    // --- Validate handle ---
    if (typeof handle !== "string") {
      return NextResponse.json({ error: "handle is required" }, { status: 400 });
    }
    const handleNorm = handle.trim().toLowerCase();
    if (!HANDLE_RE.test(handleNorm)) {
      return NextResponse.json(
        {
          error:
            "handle must be 3-20 chars, alphanumeric or dash only, lowercase",
        },
        { status: 400 }
      );
    }

    // --- Uniqueness checks ---
    const existingByEmail = await db.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    const existingByHandle = await db.user.findUnique({
      where: { handle: handleNorm },
      select: { id: true },
    });
    if (existingByHandle) {
      return NextResponse.json(
        { error: "This handle is already taken" },
        { status: 400 }
      );
    }

    // --- Hash password (scrypt + random salt) ---
    const passwordHash = hashPassword(password);

    // --- Create the user ---
    //
    // We pre-check email/handle uniqueness above, but a concurrent signup can
    // still win the race between the check and the insert. Catch the Postgres
    // unique violation (Prisma P2002) and convert it to the same friendly
    // error instead of surfacing a 500.
    let user;
    try {
      user = await db.user.create({
        data: {
          email: emailNorm,
          passwordHash,
          name: nameTrim,
          handle: handleNorm,
          title: "", // filled in during onboarding
          onboarded: false,
          // isCurrent: false (default) — the session handles "current user"
        },
        select: {
          id: true,
          email: true,
          name: true,
          handle: true,
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        const target = (err as { meta?: { target?: string[] } }).meta?.target ?? [];
        const field = target.join(", ");
        if (field.includes("email")) {
          return NextResponse.json(
            { error: "An account with this email already exists" },
            { status: 400 }
          );
        }
        if (field.includes("handle")) {
          return NextResponse.json(
            { error: "This handle is already taken" },
            { status: 400 }
          );
        }
      }
      throw err;
    }

    // --- mark an invite as accepted, if a valid token was supplied ---
    //
    // The signup link from an invite email includes ?invite=<token>. We look
    // it up by token; if it matches this signup's email we mark it accepted
    // and link it to the new user. Failures here are non-fatal — the account
    // is already created — so we only log.
    if (typeof inviteToken === "string" && inviteToken.trim()) {
      try {
        const invite = await db.invite.findUnique({
          where: { token: inviteToken.trim() },
          select: { id: true, email: true, status: true },
        });
        if (invite && invite.email === emailNorm && invite.status !== "accepted") {
          await db.invite.update({
            where: { id: invite.id },
            data: { status: "accepted", acceptedById: user.id },
          });
        }
      } catch (inviteErr) {
        console.error("[POST /api/auth/signup] invite acceptance failed", inviteErr);
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/signup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
