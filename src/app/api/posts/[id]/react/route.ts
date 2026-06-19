import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { POST_REACTIONS } from "@/lib/preship";

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

    const kind = (body as { kind?: string }).kind;
    if (!kind || !(POST_REACTIONS as readonly string[]).includes(kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${POST_REACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await db.reaction.findUnique({
      where: {
        postId_userId_kind: { postId: id, userId: user.id, kind },
      },
    });

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ reacted: false, kind });
    }

    await db.reaction.create({
      data: { postId: id, userId: user.id, kind },
    });
    return NextResponse.json({ reacted: true, kind });
  } catch (err) {
    console.error("[POST /api/posts/[id]/react]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
