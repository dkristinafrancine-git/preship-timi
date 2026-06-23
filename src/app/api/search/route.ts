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
  avatarUrl: true, isFoundingMember: true,
  bio: true,
  skills: true,
} as const;

const FOUNDER_RELATION = {
  select: {
    id: true,
    name: true,
    handle: true,
    title: true,
    avatarUrl: true, isFoundingMember: true,
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
      // Use _count aggregation (one COUNT per relation) instead of selecting
      // every reaction/comment row. Also drop the heavy audioWaveform blob and
      // truncate body to a preview snippet so we don't ship full post text for
      // every search hit.
      db.post
        .findMany({
          where: {
            type: "text",
            ...ilikeAny(q, ["body", "tags", "audioTitle"]),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            body: true,
            tags: true,
            audioTitle: true,
            projectId: true,
            authorId: true,
            createdAt: true,
            author: { select: FOUNDER_SELECT },
            project: PROJECT_RELATION,
            _count: { select: { reactions: true, comments: true } },
          },
        })
        .then((rows) =>
          rows.map((p) => ({
            id: p.id,
            type: p.type,
            // snippet only — full body fetched on demand from the post detail
            body: p.body ? p.body.slice(0, 200) : null,
            tags: p.tags,
            audioTitle: p.audioTitle,
            projectId: p.projectId,
            authorId: p.authorId,
            createdAt: p.createdAt,
            author: p.author,
            project: p.project,
            // Note: _count.reactions here is a total count, not per-kind.
            // Search previews don't need the per-kind breakdown the feed does.
            _count: {
              reactions: { like: 0, repost: 0, handshake: 0 },
              comments: p._count.comments,
            },
          }))
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
      // Drop the full article body from search results — it can be large and
      // the search list only renders title/subtitle/tags + author.
      db.article.findMany({
        where: {
          published: true,
          ...ilikeAny(q, ["title", "subtitle", "body", "tags"]),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          subtitle: true,
          tags: true,
          coverColor: true,
          createdAt: true,
          updatedAt: true,
          published: true,
          authorId: true,
          author: { select: FOUNDER_SELECT },
          _count: { select: { claps: true } },
        },
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
