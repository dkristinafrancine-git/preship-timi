import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 30-day activity window for the "recent posts" stat per project.
const ACTIVITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * GET /api/projects/recent
 *
 * Network-wide discovery: the most recently created projects across the whole
 * platform, each carrying a lightweight activity stat — the count of war-room
 * posts in the last 30 days. Powers the "recent projects" card in the war-room
 * right rail.
 *
 * Public/unauthenticated (same as /api/projects and /api/founders/top): it's a
 * discovery surface and the landing-page rail also renders it.
 *
 * The activity count uses `_count` with a relation `where` so it's a single
 * aggregate per project, not a per-post over-fetch. Capped at 5 rows, newest
 * first.
 */
export async function GET() {
  try {
    const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);

    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            isFoundingMember: true,
          },
        },
        _count: {
          select: {
            // Total posts (lifetime) for the row + posts in the activity window.
            // Prisma can't _count a filtered relation directly, so we read the
            // recent-window count via a second cheap grouped query below.
            posts: true,
            synergyRequests: true,
          },
        },
      },
    });

    if (projects.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // One grouped query: recent-post counts for all returned project ids at
    // once (avoids N per-project queries).
    const ids = projects.map((p) => p.id);
    const recent = await db.post.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const recentMap = new Map(recent.map((r) => [r.projectId, r._count._all]));

    const shaped = projects.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      category: p.category,
      alphaStage: p.alphaStage,
      logoUrl: p.logoUrl,
      logoColor: p.logoColor,
      logoMark: p.logoMark,
      website: p.website,
      createdAt: p.createdAt,
      founder: p.founder,
      activity: {
        // 30-day war-room post count — the headline "activity" stat.
        recentPosts: recentMap.get(p.id) ?? 0,
        totalPosts: p._count.posts,
        synergyRequests: p._count.synergyRequests,
      },
    }));

    return NextResponse.json({ projects: shaped });
  } catch (err) {
    console.error("[GET /api/projects/recent]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
