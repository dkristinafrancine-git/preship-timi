import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Same payload shape as /api/feed so a patched post can be dropped straight
// into the feed list on the client. Uses _count aggregation (one COUNT per
// relation) instead of selecting every reaction/comment row — see feed/route.ts.
const POST_INCLUDE = {
  author: {
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
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

type FeedPost = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

/** Aggregate per-kind reaction counts + the current user's reactions for one post. */
async function reactionsForPost(postId: string, userId?: string) {
  const [grouped, mine] = await Promise.all([
    db.reaction.groupBy({
      by: ["kind"],
      where: { postId },
      _count: { _all: true },
    }),
    userId
      ? db.reaction.findMany({
          where: { postId, userId },
          select: { kind: true },
        })
      : Promise.resolve([]),
  ]);
  const counts = { like: 0, repost: 0, handshake: 0 };
  for (const g of grouped) {
    if (g.kind === "like" || g.kind === "repost" || g.kind === "handshake") {
      counts[g.kind] = g._count._all;
    }
  }
  return {
    counts,
    myReaction: mine.map((r) => r.kind),
  };
}

async function shapePost(post: FeedPost, currentUserId?: string) {
  const { counts, myReaction } = await reactionsForPost(post.id, currentUserId);
  return {
    id: post.id,
    type: post.type,
    body: post.body,
    audioTitle: post.audioTitle,
    audioUrl: post.audioUrl,
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
      comments: post._count.comments,
    },
    myReaction,
  };
}

// PATCH /api/posts/[id] — update a post (author only)
// Body may include: body, tags, audioTitle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const existing = await db.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { body: postBody, tags, audioTitle } = body as {
      body?: string;
      tags?: string;
      audioTitle?: string;
    };

    const data: Record<string, unknown> = {};

    if (postBody !== undefined) {
      if (typeof postBody !== "string" || postBody.trim().length === 0) {
        return NextResponse.json(
          { error: "body must be a non-empty string" },
          { status: 400 }
        );
      }
      data.body = postBody.trim();
    }
    if (tags !== undefined) {
      if (tags === null) {
        data.tags = null;
      } else if (typeof tags === "string") {
        data.tags = tags;
      } else {
        return NextResponse.json(
          { error: "tags must be a string or null" },
          { status: 400 }
        );
      }
    }
    if (audioTitle !== undefined) {
      if (audioTitle === null) {
        data.audioTitle = null;
      } else if (typeof audioTitle === "string") {
        data.audioTitle = audioTitle.trim();
      } else {
        return NextResponse.json(
          { error: "audioTitle must be a string or null" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await db.post.update({
      where: { id },
      data,
      include: POST_INCLUDE,
    });

    return NextResponse.json({ post: await shapePost(updated, user.id) });
  } catch (err) {
    console.error("[PATCH /api/posts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/posts/[id] — delete a post (author only)
// Prisma cascades reactions and comments via onDelete: Cascade in the schema.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const existing = await db.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    await db.post.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/posts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
