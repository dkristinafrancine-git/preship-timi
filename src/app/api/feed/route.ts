import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Display-only fields for the author + project on a feed post. Never pull
// passwordHash, email, or large relations we won't render.
const POST_INCLUDE = {
  author: {
    select: { id: true, name: true, handle: true, title: true, avatarUrl: true, isFoundingMember: true, bio: true, location: true, skills: true },
  },
  project: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      logoMark: true,
      logoColor: true,
      alphaStage: true,
      category: true,
    },
  },
  // Aggregated counts — Prisma emits one SQL COUNT(*) per relation, NOT one
  // row per reaction/comment. This is what makes the feed cheap at scale:
  // previously the code selected every reaction/comment row for every post
  // and counted in JS (an N×M over-fetch). _count stays O(posts).
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

type FeedPost = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

/**
 * Build a per-kind reaction-count map for a page of posts in ONE query.
 *
 * Rather than include `reactions` on each post (which fetches every row),
 * we run a single grouped count over the whole page's post ids. Returns a
 * Map<postId, { like, repost, handshake }>.
 */
async function reactionCountsForPosts(
  postIds: string[]
): Promise<Map<string, { like: number; repost: number; handshake: number }>> {
  if (postIds.length === 0) return new Map();
  const rows = await db.reaction.groupBy({
    by: ["postId", "kind"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  const map = new Map<string, { like: number; repost: number; handshake: number }>();
  for (const r of rows) {
    const entry = map.get(r.postId) ?? { like: 0, repost: 0, handshake: 0 };
    if (r.kind === "like" || r.kind === "repost" || r.kind === "handshake") {
      entry[r.kind] = r._count._all;
    }
    map.set(r.postId, entry);
  }
  return map;
}

/**
 * Fetch the current user's reaction kinds across the page (ONE query), so
 * each post can carry a cheap `myReaction: string[]` without pulling every
 * reaction row for every post.
 */
async function myReactionsForPosts(
  postIds: string[],
  userId: string
): Promise<Map<string, string[]>> {
  if (postIds.length === 0) return new Map();
  const rows = await db.reaction.findMany({
    where: { postId: { in: postIds }, userId },
    select: { postId: true, kind: true },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.postId) ?? [];
    arr.push(r.kind);
    map.set(r.postId, arr);
  }
  return map;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") ?? "newest";
    const tag = searchParams.get("tag") ?? undefined;
    const authorId = searchParams.get("authorId") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;

    // Parallel: resolve the current user (needed for myReaction) and run the
    // post query at the same time. getCurrentUser hits the session, not the
    // DB for the user row, so these don't contend for the same table.
    const userPromise = getCurrentUser();

    const where: Prisma.PostWhereInput = {};
    if (authorId) where.authorId = authorId;
    if (projectId) where.projectId = projectId;
    if (tag) {
      // PostgreSQL supports case-insensitive `contains` via mode: "insensitive".
      where.tags = { contains: tag, mode: "insensitive" };
    }

    // Trending needs the full 50 to score+re-rank in JS; newest only needs 50.
    // (No client pagination yet — see notes in AGENT.md on cursor pagination.)
    const take = 50;

    const [user, posts] = await Promise.all([
      userPromise,
      db.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    const postIds = posts.map((p) => p.id);

    // Two cheap batched queries replace the per-post reaction/comment row fetch.
    const [reactionCounts, myReactions] = await Promise.all([
      reactionCountsForPosts(postIds),
      user ? myReactionsForPosts(postIds, user.id) : Promise.resolve(new Map<string, string[]>()),
    ]);

    const shaped = posts.map((p: FeedPost) => {
      const counts = reactionCounts.get(p.id) ?? { like: 0, repost: 0, handshake: 0 };
      return {
        id: p.id,
        type: p.type,
        body: p.body,
        audioTitle: p.audioTitle,
        audioUrl: p.audioUrl,
        audioDuration: p.audioDuration,
        audioWaveform: p.audioWaveform,
        tags: p.tags,
        projectId: p.projectId,
        authorId: p.authorId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        author: p.author,
        project: p.project,
        impressions: p.impressions,
        _count: {
          reactions: counts,
          comments: p._count.comments,
        },
        myReaction: myReactions.get(p.id) ?? [],
      };
    });

    if (sort === "trending") {
      return NextResponse.json({
        posts: shaped
          .map((p) => ({
            post: p,
            score:
              (p._count.reactions.handshake ?? 0) * 3 +
              (p._count.reactions.like ?? 0) +
              (p._count.reactions.repost ?? 0) * 2,
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (
              new Date(b.post.createdAt).getTime() -
              new Date(a.post.createdAt).getTime()
            );
          })
          .slice(0, 20)
          .map((x) => x.post),
      });
    }

    return NextResponse.json({ posts: shaped });
  } catch (err) {
    console.error("[GET /api/feed]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
