import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// DELETE /api/posts/[id]/comment/[commentId]
// Allowed for the comment author OR the post author.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, userId: true },
    });

    if (!comment || comment.postId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Post author can delete any comment on their post; otherwise only the author.
    const post = await db.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isCommentAuthor = comment.userId === user.id;
    const isPostAuthor = post.authorId === user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json(
        { error: "Only the comment author or the post author can delete this comment" },
        { status: 403 }
      );
    }

    await db.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/posts/[id]/comment/[commentId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
