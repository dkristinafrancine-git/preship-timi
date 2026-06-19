import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/founders/[id]
 * Returns a founder's public profile. Includes projects always; includes
 * gathered bounties only if bountiesPublic=true.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const founder = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        handle: true,
        title: true,
        bio: true,
        location: true,
        avatarUrl: true,
        skills: true,
        bountiesPublic: true,
        createdAt: true,
      },
    });
    if (!founder) return NextResponse.json({ error: "Founder not found" }, { status: 404 });

    const projects = await db.project.findMany({
      where: { founderId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tagline: true,
        category: true,
        alphaStage: true,
        logoColor: true,
        logoMark: true,
        website: true,
        _count: { select: { posts: true, synergyRequests: true } },
      },
    });

    let bounties: unknown[] = [];
    if (founder.bountiesPublic) {
      const offers = await db.synergyOffer.findMany({
        where: { founderId: id, status: "accepted" },
        orderBy: { createdAt: "desc" },
        include: {
          request: {
            include: {
              founder: {
                select: { id: true, name: true, handle: true, title: true, avatarUrl: true, bio: true, location: true, skills: true },
              },
              project: {
                select: { id: true, name: true, logoMark: true, logoColor: true, alphaStage: true, category: true },
              },
            },
          },
        },
      });
      bounties = offers;
    }

    return NextResponse.json({ founder, projects, bounties });
  } catch (err) {
    console.error("[GET /api/founders/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
