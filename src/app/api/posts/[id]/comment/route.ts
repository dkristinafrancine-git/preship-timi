import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { notify } from "@/lib/notify";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await db.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, handle: true, title: true, avatarUrl: true, isFoundingMember: true, bio: true, location: true, skills: true },
        },
      },
    });
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("[GET /api/posts/[id]/comment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const commentBody = (body as { body?: string }).body;
    if (
      !commentBody ||
      typeof commentBody !== "string" ||
      commentBody.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "body is required and must be non-empty" },
        { status: 400 }
      );
    }

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        postId: id,
        userId: user.id,
        body: commentBody.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, handle: true, title: true, avatarUrl: true, isFoundingMember: true, bio: true, location: true, skills: true },
        },
      },
    });

    // notify the post author (don't notify self)
    if (post.authorId !== user.id) {
      await notify(
        post.authorId,
        "comment",
        `${user.name} replied to your post`,
        commentBody.trim(),
        "war-room",
        id
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/posts/[id]/comment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
