import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// POST /api/articles/[id]/clap — toggle a clap on an article.
// If a clap exists for (articleId, currentUserId), delete it (un-clap).
// Otherwise create it (clap). Returns { clapped: boolean }.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "No current user" },
        { status: 401 }
      );
    }

    const article = await db.article.findUnique({
      where: { id },
      select: { id: true, published: true, authorId: true },
    });
    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Unpublished articles can only be clapped by their author (so authors
    // can sanity-check the flow on a draft). Public readers can't see them.
    if (!article.published && article.authorId !== user.id) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const existing = await db.articleClap.findUnique({
      where: {
        articleId_userId: { articleId: id, userId: user.id },
      },
    });

    if (existing) {
      await db.articleClap.delete({ where: { id: existing.id } });
      return NextResponse.json({ clapped: false });
    }

    await db.articleClap.create({
      data: { articleId: id, userId: user.id },
    });
    return NextResponse.json({ clapped: true });
  } catch (err) {
    console.error("[POST /api/articles/[id]/clap]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
