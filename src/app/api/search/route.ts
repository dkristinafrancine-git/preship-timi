import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/search?q=<query>
//
// Search across founders, projects, posts (text), synergy requests, and
// published articles. Each category is capped at 5 results.
//
// SQLite + Prisma `contains` is case-sensitive for ASCII, so to give the user
// a real case-insensitive experience we fetch a bounded candidate pool per
// category and then filter in JS with `.toLowerCase()`. This is fine for the
// demo's data volumes and matches the search semantics users expect.
//
// Returns: { founders, projects, posts, synergy, articles }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get("q") ?? "";
    const q = rawQ.trim();
    const needle = q.toLowerCase();

    const empty = {
      founders: [],
      projects: [],
      posts: [],
      synergy: [],
      articles: [],
    };

    if (!needle || needle.length < 2) {
      return NextResponse.json(empty);
    }

    // Helper: case-insensitive substring match across multiple string fields.
    const matches = (haystacks: (string | null | undefined)[]) =>
      haystacks.some((h) => (h ?? "").toLowerCase().includes(needle));

    // --- Founders ---
    const founderCandidates = await db.user.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        handle: true,
        title: true,
        avatarUrl: true,
        bio: true,
        skills: true,
      },
    });
    const founders = founderCandidates
      .filter((u) =>
        matches([u.name, u.handle, u.title, u.bio, u.skills])
      )
      .slice(0, 5);

    // --- Projects ---
    const projectCandidates = await db.project.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        founder: {
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
      },
    });
    const projects = projectCandidates
      .filter((p) =>
        matches([
          p.name,
          p.tagline,
          p.description,
          p.category,
          p.alphaStage,
          p.logoMark,
        ])
      )
      .slice(0, 5);

    // --- Posts (text only) ---
    const postCandidates = await db.post.findMany({
      where: { type: "text" },
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
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
        reactions: { select: { id: true, userId: true, kind: true } },
        comments: { select: { id: true } },
      },
    });
    const posts = postCandidates
      .filter((p) => matches([p.body, p.tags, p.audioTitle]))
      .slice(0, 5)
      .map((p) => {
        const counts = (p.reactions ?? []).reduce<Record<string, number>>(
          (acc, r) => {
            acc[r.kind] = (acc[r.kind] ?? 0) + 1;
            return acc;
          },
          { like: 0, repost: 0, handshake: 0 }
        );
        return {
          id: p.id,
          type: p.type,
          body: p.body,
          tags: p.tags,
          projectId: p.projectId,
          authorId: p.authorId,
          createdAt: p.createdAt,
          author: p.author,
          project: p.project,
          _count: {
            reactions: counts,
            comments: (p.comments ?? []).length,
          },
        };
      });

    // --- Synergy requests ---
    const synergyCandidates = await db.synergyRequest.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        founder: {
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
        _count: { select: { offers: true } },
      },
    });
    const synergy = synergyCandidates
      .filter((s) =>
        matches([s.title, s.bottleneck, s.need, s.bountyDetail, s.tags])
      )
      .slice(0, 5);

    // --- Articles (published only) ---
    const articleCandidates = await db.article.findMany({
      where: { published: true },
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
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
      },
    });
    const articles = articleCandidates
      .filter((a) => matches([a.title, a.subtitle, a.body, a.tags]))
      .slice(0, 5);

    return NextResponse.json({
      founders,
      projects,
      posts,
      synergy,
      articles,
    });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
