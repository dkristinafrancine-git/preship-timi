import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Shared include for feed posts
const POST_INCLUDE = {
  author: {
    select: { id: true, name: true, handle: true, title: true, avatarUrl: true, bio: true, location: true, skills: true },
  },
  project: {
    select: {
      id: true,
      name: true,
      logoMark: true,
      logoColor: true,
      alphaStage: true,
      category: true,
    },
  },
  reactions: { select: { id: true, userId: true, kind: true } },
  comments: { select: { id: true } },
} satisfies Prisma.PostInclude;

type FeedPost = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

function shapePost(post: FeedPost, currentUserId?: string) {
  const counts = (post.reactions ?? []).reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1;
      return acc;
    },
    { like: 0, repost: 0, handshake: 0 }
  );

  const myReaction = (post.reactions ?? [])
    .filter((r) => r.userId === currentUserId)
    .map((r) => r.kind);

  return {
    id: post.id,
    type: post.type,
    body: post.body,
    audioTitle: post.audioTitle,
    audioDuration: post.audioDuration,
    audioWaveform: post.audioWaveform,
    tags: post.tags,
    projectId: post.projectId,
    authorId: post.authorId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    project: post.project,
    _count: {
      reactions: counts,
      comments: (post.comments ?? []).length,
    },
    myReaction,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") ?? "newest";
    const tag = searchParams.get("tag") ?? undefined;
    const authorId = searchParams.get("authorId") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;

    const user = await getCurrentUser();

    const where: Record<string, unknown> = {};
    if (authorId) where.authorId = authorId;
    if (projectId) where.projectId = projectId;
    if (tag) {
      // PostgreSQL supports case-insensitive `contains` via mode: "insensitive".
      where.tags = { contains: tag, mode: "insensitive" };
    }

    const posts = await db.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: sort === "trending" ? 50 : 50,
    });

    let shaped = posts.map((p) => shapePost(p, user?.id));

    if (sort === "trending") {
      shaped = shaped
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
        .map((x) => x.post);
    }

    return NextResponse.json({ posts: shaped });
  } catch (err) {
    console.error("[GET /api/feed]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
