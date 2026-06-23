import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/admin/users
 *
 * Users table for the /admin console. Cursor-paginated on createdAt desc
 * (keyset — never skip/take) with:
 *  - q:          case-insensitive search across name/handle/email (ILIKE).
 *  - activity:   "active" | "passive" | "all" — active = lastSeenAt within `days`.
 *  - days:       the active window (default 7; the UI offers a 7/30 toggle).
 *
 * Includes `email` — this is the admin console, not a public endpoint, so the
 * AGENT.md rule excluding email from public payloads does not apply. passwordHash
 * is NEVER selected (security rule).
 *
 * Note on the ILIKE search: leading-wildcard ILIKE (`%q%`) is not accelerated by
 * the existing B-tree indexes on User, so it seq-scans. That's fine for an admin
 * tool at current scale; if the user base grows large, add a GIN trigram index
 * on (name, handle, email) in a raw migration — mirror the Post/Article trigram
 * indexes. Do NOT try to declare it in schema.prisma.
 */
const PAGE_SIZE = 25;
const ACTIVITY_FILTERS = ["all", "active", "passive"];

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const activity = searchParams.get("activity") ?? "all";
    const daysRaw = Number(searchParams.get("days") ?? "7");
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 7;
    const cursorParam = searchParams.get("cursor"); // ISO createdAt of the last row

    if (!ACTIVITY_FILTERS.includes(activity)) {
      return NextResponse.json({ error: "Invalid activity filter" }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { handle: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(activity === "active"
        ? { lastSeenAt: { gte: cutoff } }
        : activity === "passive"
          ? // passive = NOT seen within the window (includes never-seen nulls).
            { OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null }] }
          : {}),
      ...(cursorParam ? { createdAt: { lt: new Date(cursorParam) } } : {}),
    };

    const rows = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        title: true,
        avatarUrl: true,
        role: true,
        isFoundingMember: true,
        onboarded: true,
        lastSeenAt: true,
        createdAt: true,
        // passwordHash deliberately omitted.
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor = hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ items: page, nextCursor });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
