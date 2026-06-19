import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/search?q=<query>
//
// Search across founders, projects, posts (text), synergy requests, and
// published articles. Each category is capped at 5 results.
//
// PostgreSQL supports Prisma's `mode: "insensitive"` (`ILIKE`), so filtering is
// pushed into the database query against indexed columns rather than fetched
// into JS. With the indexes added in the Supabase migration (e.g.
// Post_createdAt_idx, Article_published_createdAt_idx, User_handle_idx) these
// ILIKE scans stay cheap at demo volumes and degrade gracefully as data grows.
//
// Returns: { founders, projects, posts, synergy, articles }

/** Build an OR predicate matching `needle` (case-insensitive) against any field. */
function ilikeAny(needle: string, fields: string[]) {
  return {
    OR: fields.map((f) => ({ [f]: { contains: needle, mode: "insensitive" as const } })),
  };
}

const FOUNDER_SELECT = {
  id: true,
  name: true,
  handle: true,
  title: true,
  avatarUrl: true,
  bio: true,
  skills: true,
} as const;

const FOUNDER_RELATION = {
  select: {
    id: true,
    name: true,
    handle: true,
    title: true,
    avatarUrl: true,
    bio: true,
    location: true,
    skills: true,
  },
};

const PROJECT_RELATION = {
  select: {
    id: true,
    name: true,
    logoUrl: true,
    logoMark: true,
    logoColor: true,
    alphaStage: true,
    category: true,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    const empty = {
      founders: [],
      projects: [],
      posts: [],
      synergy: [],
      articles: [],
    };

    if (!q || q.length < 2) {
      return NextResponse.json(empty);
    }

    // Run all five category searches in parallel.
    const [founders, projects, posts, synergy, articles] = await Promise.all([
      // --- Founders ---
      db.user.findMany({
        where: ilikeAny(q, ["name", "handle", "title", "bio", "skills"]),
        orderBy: { createdAt: "desc" },
        take: 5,
        select: FOUNDER_SELECT,
      }),

      // --- Projects ---
      db.project.findMany({
        where: ilikeAny(q, [
          "name",
          "tagline",
          "description",
          "category",
          "alphaStage",
          "logoMark",
        ]),
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { founder: { select: FOUNDER_SELECT } },
      }),

      // --- Posts (text only) ---
      db.post
        .findMany({
          where: {
            type: "text",
            ...ilikeAny(q, ["body", "tags", "audioTitle"]),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            author: { select: FOUNDER_SELECT },
            project: PROJECT_RELATION,
            reactions: { select: { id: true, userId: true, kind: true } },
            comments: { select: { id: true } },
          },
        })
        .then((rows) =>
          rows.map((p) => {
            const counts = (p.reactions ?? []).reduce<Record<string, number>>(
              (acc, r) => {
                acc[r.kind] = (acc[r.kind] ?? 0) + 1;
                return acc;
              },
              { like: 0, repost: 0, handshake: 0 }
            );
            return {
              id: p.id,
              type: p.type,
              body: p.body,
              tags: p.tags,
              projectId: p.projectId,
              authorId: p.authorId,
              createdAt: p.createdAt,
              author: p.author,
              project: p.project,
              _count: {
                reactions: counts,
                comments: (p.comments ?? []).length,
              },
            };
          })
        ),

      // --- Synergy requests ---
      db.synergyRequest.findMany({
        where: ilikeAny(q, [
          "title",
          "bottleneck",
          "need",
          "bountyDetail",
          "tags",
        ]),
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          founder: { select: FOUNDER_SELECT },
          project: PROJECT_RELATION,
          _count: { select: { offers: true } },
        },
      }),

      // --- Articles (published only) ---
      db.article.findMany({
        where: {
          published: true,
          ...ilikeAny(q, ["title", "subtitle", "body", "tags"]),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: FOUNDER_SELECT } },
      }),
    ]);

    return NextResponse.json({
      founders,
      projects,
      posts,
      synergy,
      articles,
    });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
