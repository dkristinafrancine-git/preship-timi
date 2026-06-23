import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ALPHA_STAGES, PROJECT_CATEGORIES } from "@/lib/preship";

function initialsFromName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const PROJECT_LIST_INCLUDE = {
  founder: {
    select: { id: true, name: true, handle: true, title: true, avatarUrl: true, isFoundingMember: true, bio: true, location: true, skills: true },
  },
  _count: { select: { posts: true, synergyRequests: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const founderId = searchParams.get("founderId") ?? undefined;

    const projects = await db.project.findMany({
      where: founderId ? { founderId } : undefined,
      include: PROJECT_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      name,
      tagline,
      description,
      category,
      alphaStage,
      logoUrl,
      logoColor,
      logoMark,
      website,
    } = body as {
      name?: string;
      tagline?: string;
      description?: string;
      category?: string;
      alphaStage?: string;
      logoUrl?: string;
      logoColor?: string;
      logoMark?: string;
      website?: string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!tagline || typeof tagline !== "string") {
      return NextResponse.json({ error: "tagline is required" }, { status: 400 });
    }
    if (!category || !(PROJECT_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${PROJECT_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!alphaStage || !(ALPHA_STAGES as readonly string[]).includes(alphaStage)) {
      return NextResponse.json(
        { error: `alphaStage must be one of: ${ALPHA_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        founderId: user.id,
        name: name.trim(),
        tagline: tagline.trim(),
        description: typeof description === "string" ? description : null,
        category,
        alphaStage,
        logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
        logoColor: typeof logoColor === "string" ? logoColor : "#DAFF01",
        logoMark:
          typeof logoMark === "string" && logoMark.trim().length > 0
            ? logoMark.trim()
            : initialsFromName(name),
        website: typeof website === "string" ? website : null,
      },
      include: PROJECT_LIST_INCLUDE,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
