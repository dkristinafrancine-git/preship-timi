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
      orderBy: { posts: { _count: "desc" } },
      take: 5,
      select: {
        id: true,
        handle: true,
        name: true,
        title: true,
        avatarUrl: true,
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json({
      founders: founders.map((f) => ({
        id: f.id,
        email: "",
        handle: f.handle,
        name: f.name,
        title: f.title,
        avatarUrl: f.avatarUrl,
        isCurrent: false,
        postCount: f._count.posts,
      })),
    });
  } catch (err) {
    console.error("[GET /api/founders/top]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
