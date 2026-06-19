import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ALPHA_STAGES, PROJECT_CATEGORIES } from "@/lib/preship";

const PROJECT_DETAIL_INCLUDE = {
  founder: {
    select: { id: true, name: true, handle: true, title: true, avatarUrl: true, bio: true, location: true, skills: true },
  },
  _count: { select: { posts: true, synergyRequests: true } },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: PROJECT_DETAIL_INCLUDE,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[GET /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (existing.founderId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own projects" },
        { status: 403 }
      );
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
    } = body as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (typeof name === "string") {
      if (name.trim().length === 0) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = name.trim();
    }
    if (typeof tagline === "string") data.tagline = tagline.trim();
    if (typeof description === "string") data.description = description;
    if (typeof website === "string") data.website = website;
    if (typeof logoUrl === "string") data.logoUrl = logoUrl || null;
    if (typeof logoColor === "string") data.logoColor = logoColor;
    if (typeof logoMark === "string") data.logoMark = logoMark.trim();
    if (category !== undefined) {
      if (typeof category !== "string" || !(PROJECT_CATEGORIES as readonly string[]).includes(category)) {
        return NextResponse.json(
          { error: `category must be one of: ${PROJECT_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      data.category = category;
    }
    if (alphaStage !== undefined) {
      if (typeof alphaStage !== "string" || !(ALPHA_STAGES as readonly string[]).includes(alphaStage)) {
        return NextResponse.json(
          { error: `alphaStage must be one of: ${ALPHA_STAGES.join(", ")}` },
          { status: 400 }
        );
      }
      data.alphaStage = alphaStage;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const project = await db.project.update({
      where: { id },
      data,
      include: PROJECT_DETAIL_INCLUDE,
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete a project (owner only)
// Prisma cascades posts (SetNull on projectId) and synergyRequests (SetNull
// on projectId) per the schema; child reactions/comments on those posts
// cascade through their own Post relation.
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

    const existing = await db.project.findUnique({
      where: { id },
      select: { founderId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (existing.founderId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own projects" },
        { status: 403 }
      );
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
