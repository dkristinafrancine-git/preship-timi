import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/founders/top
 * Returns the top 5 founders by post count, falling back to creation order
 * for ties / users without posts. Used by the War Room right rail leaderboard.
 */
export async function GET() {
  try {
    const founders = await db.user.findMany({
      // Post-count desc with a deterministic createdAt tiebreaker (previously
      // the comment promised a tiebreaker the query didn't actually have, so
      // tie order was undefined across requests).
      orderBy: [{ posts: { _count: "desc" } }, { createdAt: "asc" }],
      take: 5,
      select: {
        id: true,
        handle: true,
        name: true,
        title: true,
        avatarUrl: true, isFoundingMember: true,
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json(
      {
        founders: founders.map((f) => ({
          id: f.id,
          handle: f.handle,
          name: f.name,
          title: f.title,
          avatarUrl: f.avatarUrl,
          isFoundingMember: f.isFoundingMember,
          isCurrent: false,
          postCount: f._count.posts,
        })),
      },
      // Leaderboard changes slowly; cache briefly so navigation doesn't
      // re-run the aggregate sort across all users.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[GET /api/founders/top]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
