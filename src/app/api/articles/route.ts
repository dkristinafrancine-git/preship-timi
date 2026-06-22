import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Shared include for the POST create response (full row, including body).
const ARTICLE_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      handle: true,
      title: true,
      avatarUrl: true, isFoundingMember: true,
    },
  },
  _count: { select: { claps: true } },
} satisfies Prisma.ArticleInclude;

// List-card select: everything ArticleCard renders, minus the heavy `body`
// markdown column. The list view never renders body — it lives in the detail
// dialog fetched from /api/articles/[id]. Omitting it here keeps the list
// payload proportional to row count, not to article length.
const ARTICLE_LIST_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  tags: true,
  coverColor: true,
  published: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      handle: true,
      title: true,
      avatarUrl: true, isFoundingMember: true,
    },
  },
  _count: { select: { claps: true } },
} satisfies Prisma.ArticleSelect;

/**
 * Cached published-articles query. This is the expensive part — a scan + author
 * join over up to 50 rows — and it's fully public (no per-user data), so we
 * cache it in Next.js's Data Cache (which Vercel serves from the edge). The
 * key includes `authorId` so an author-filtered list gets its own entry.
 *
 * Per-user state (`myClap`) is NOT included here — it's computed fresh on each
 * request from a separate indexed lookup, so the cache never serves one user's
 * clap state to another. Drafts are never cached (private per user).
 */
const getPublishedArticles = unstable_cache(
  async (authorId: string | undefined) => {
    const where: Prisma.ArticleWhereInput = { published: true };
    if (authorId) where.authorId = authorId;
    return db.article.findMany({
      where,
      select: ARTICLE_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
  ["articles", "published-list"], // cache key tags
  { revalidate: 30, tags: ["articles"] } // 30s TTL; useMutate revalidates on writes
);

// GET /api/articles — list published articles, newest first.
// Query params:
//   ?authorId=<id>  filter by author
//   ?drafts=1       return the current user's drafts (unpublished) instead of published
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("authorId") ?? undefined;
    const drafts = searchParams.get("drafts") === "1";

    // Resolve the viewer once so we can stamp `myClap` onto each row in a
    // single batched query instead of N per-row membership lookups.
    const user = await getCurrentUser();

    // Drafts branch: private, never cached, skips the cached query entirely.
    if (drafts) {
      if (!user) {
        return NextResponse.json({ error: "No current user" }, { status: 401 });
      }
      const draftArticles = await db.article.findMany({
        where: { published: false, authorId: user.id },
        select: ARTICLE_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ articles: draftArticles });
    }

    // Published branch: the heavy findMany is served from the Data Cache
    // (edge on Vercel); only the per-user myClap probe hits the DB per request.
    const articles = await getPublishedArticles(authorId);

    const articleIds = articles.map((a) => a.id);
    const myClappedIds = user && articleIds.length > 0
      ? new Set(
          (
            await db.articleClap.findMany({
              where: { articleId: { in: articleIds }, userId: user.id },
              select: { articleId: true },
            })
          ).map((c) => c.articleId)
        )
      : new Set<string>();

    const withMine = articles.map((a) => ({
      ...a,
      myClap: myClappedIds.has(a.id),
    }));

    return NextResponse.json(
      { articles: withMine },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } }
    );
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
