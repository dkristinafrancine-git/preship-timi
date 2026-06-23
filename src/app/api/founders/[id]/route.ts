import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Display fields shared across relations — keep this lean; never include
// passwordHash/email and only pull bio/location/skills where they're actually
// rendered (the profile header, not every nested relation).
const FOUNDER_PROFILE_SELECT = {
  id: true,
  name: true,
  handle: true,
  title: true,
  bio: true,
  location: true,
  avatarUrl: true, isFoundingMember: true,
  skills: true,
} as const;

const FOUNDER_CARD_SELECT = {
  id: true,
  name: true,
  handle: true,
  title: true,
  avatarUrl: true, isFoundingMember: true,
} as const;

const PROJECT_CARD_SELECT = {
  id: true,
  name: true,
  tagline: true,
  category: true,
  alphaStage: true,
  logoColor: true,
  logoMark: true,
  logoUrl: true,
  website: true,
} as const;

/**
 * GET /api/founders/[id]
 * Returns a founder's public profile. Includes projects always; includes
 * gathered bounties only if bountiesPublic=true.
 *
 * The founder, projects, and bounties queries are independent — they're run
 * in parallel rather than sequentially. (Previously three awaits in a row.)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the founder first because bounties depend on bountiesPublic.
    const founder = await db.user.findUnique({
      where: { id },
      select: {
        ...FOUNDER_PROFILE_SELECT,
        bountiesPublic: true,
        createdAt: true,
      },
    });
    if (!founder) {
      return NextResponse.json({ error: "Founder not found" }, { status: 404 });
    }

    // Projects is independent of bountiesPublic; bounties only runs if public.
    // Run them in parallel so we make one round-trip, not two sequential.
    const projectsPromise = db.project.findMany({
      where: { founderId: id },
      orderBy: { createdAt: "desc" },
      select: {
        ...PROJECT_CARD_SELECT,
        _count: { select: { posts: true, synergyRequests: true } },
      },
    });

    const bountiesPromise = founder.bountiesPublic
      ? db.synergyOffer.findMany({
          where: { founderId: id, status: "accepted" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            pitch: true,
            offer: true,
            createdAt: true,
            request: {
              select: {
                id: true,
                title: true,
                bountyType: true,
                status: true,
                founder: { select: FOUNDER_CARD_SELECT },
                project: {
                  select: {
                    id: true,
                    name: true,
                    logoMark: true,
                    logoColor: true,
                    alphaStage: true,
                    category: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]);

    const [projects, bounties] = await Promise.all([projectsPromise, bountiesPromise]);

    return NextResponse.json({ founder, projects, bounties });
  } catch (err) {
    console.error("[GET /api/founders/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
