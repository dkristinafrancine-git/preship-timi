import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Shared include for article detail payload. We pull the claps array
// (with userId only) so we can compute `myClap` for the current user
// in addition to the _count.
const ARTICLE_DETAIL_INCLUDE = {
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
  claps: { select: { id: true, userId: true } },
  _count: { select: { claps: true } },
} satisfies Prisma.ArticleInclude;

type ArticleDetail = Prisma.ArticleGetPayload<{
  include: typeof ARTICLE_DETAIL_INCLUDE;
}>;

function shapeArticle(article: ArticleDetail, currentUserId?: string) {
  const myClap = currentUserId
    ? article.claps.some((c) => c.userId === currentUserId)
    : false;
  return {
    id: article.id,
    authorId: article.authorId,
    author: article.author,
    title: article.title,
    subtitle: article.subtitle,
    body: article.body,
    tags: article.tags,
    published: article.published,
    coverColor: article.coverColor,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    _count: { claps: article._count.claps },
    myClap,
  };
}

// GET /api/articles/[id] — fetch one article.
// Visibility: published articles are public. Unpublished articles are
// only visible to their author.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();

    const article = await db.article.findUnique({
      where: { id },
      include: ARTICLE_DETAIL_INCLUDE,
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // If unpublished, only the author may read it.
    if (!article.published && article.authorId !== user?.id) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ article: shapeArticle(article, user?.id) });
  } catch (err) {
    console.error("[GET /api/articles/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/articles/[id] — update an article (author only).
// Body may include: title, subtitle, body, tags, published, coverColor
export async function PATCH(
  req: NextRequest,
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

    const existing = await db.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own articles" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      title,
      subtitle,
      body: articleBody,
      tags,
      published,
      coverColor,
    } = body as {
      title?: string;
      subtitle?: string | null;
      body?: string;
      tags?: string | null;
      published?: boolean;
      coverColor?: string;
    };

    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "title must be a non-empty string" },
          { status: 400 }
        );
      }
      data.title = title.trim();
    }
    if (subtitle !== undefined) {
      if (subtitle === null) {
        data.subtitle = null;
      } else if (typeof subtitle === "string") {
        data.subtitle = subtitle.trim();
      } else {
        return NextResponse.json(
          { error: "subtitle must be a string or null" },
          { status: 400 }
        );
      }
    }
    if (articleBody !== undefined) {
      if (
        typeof articleBody !== "string" ||
        articleBody.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "body must be a non-empty string" },
          { status: 400 }
        );
      }
      data.body = articleBody;
    }
    if (tags !== undefined) {
      if (tags === null) {
        data.tags = null;
      } else if (typeof tags === "string") {
        data.tags = tags.trim();
      } else {
        return NextResponse.json(
          { error: "tags must be a string or null" },
          { status: 400 }
        );
      }
    }
    if (published !== undefined) {
      if (typeof published !== "boolean") {
        return NextResponse.json(
          { error: "published must be a boolean" },
          { status: 400 }
        );
      }
      data.published = published;
    }
    if (coverColor !== undefined) {
      if (typeof coverColor !== "string" || coverColor.trim().length === 0) {
        return NextResponse.json(
          { error: "coverColor must be a non-empty string" },
          { status: 400 }
        );
      }
      data.coverColor = coverColor.trim();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await db.article.update({
      where: { id },
      data,
      include: ARTICLE_DETAIL_INCLUDE,
    });

    return NextResponse.json({ article: shapeArticle(updated, user.id) });
  } catch (err) {
    console.error("[PATCH /api/articles/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/articles/[id] — delete an article (author only).
// Prisma cascades claps via onDelete: Cascade in the schema.
export async function DELETE(
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

    const existing = await db.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own articles" },
        { status: 403 }
      );
    }

    await db.article.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/articles/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
