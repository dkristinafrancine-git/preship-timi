import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Shared include for article list/detail payloads.
const ARTICLE_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      handle: true,
      title: true,
      avatarUrl: true,
    },
  },
  _count: { select: { claps: true } },
} satisfies Prisma.ArticleInclude;

// GET /api/articles — list published articles, newest first.
// Query params:
//   ?authorId=<id>  filter by author
//   ?drafts=1       return the current user's drafts (unpublished) instead of published
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("authorId") ?? undefined;
    const drafts = searchParams.get("drafts") === "1";

    let where: Prisma.ArticleWhereInput;
    if (drafts) {
      // Return only the current user's unpublished drafts
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "No current user" }, { status: 401 });
      }
      where = { published: false, authorId: user.id };
    } else {
      where = { published: true };
      if (authorId) where.authorId = authorId;
    }

    const articles = await db.article.findMany({
      where,
      include: ARTICLE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[GET /api/articles]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/articles — create an article as the current user.
// Body: { title, subtitle?, body, tags?, published?, coverColor? }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "No current user" },
        { status: 401 }
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
      subtitle?: string;
      body?: string;
      tags?: string;
      published?: boolean;
      coverColor?: string;
    };

    if (
      !title ||
      typeof title !== "string" ||
      title.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }
    if (
      !articleBody ||
      typeof articleBody !== "string" ||
      articleBody.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const article = await db.article.create({
      data: {
        authorId: user.id,
        title: title.trim(),
        subtitle:
          typeof subtitle === "string" && subtitle.trim().length > 0
            ? subtitle.trim()
            : null,
        body: articleBody,
        tags:
          typeof tags === "string" && tags.trim().length > 0
            ? tags.trim()
            : null,
        published: typeof published === "boolean" ? published : false,
        coverColor:
          typeof coverColor === "string" && coverColor.trim().length > 0
            ? coverColor.trim()
            : "#0E1909",
      },
      include: ARTICLE_INCLUDE,
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/articles]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
