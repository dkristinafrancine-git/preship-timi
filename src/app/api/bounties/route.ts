import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

/**
 * GET /api/bounties
 * Returns the "gathered bounties" for a founder = accepted SynergyOffers
 * (handshakes they offered that the requester accepted).
 *
 * Query params:
 *  - ?mine=1   → return the current user's gathered bounties (always allowed)
 *  - ?founderId=<id> → return that founder's gathered bounties, but ONLY if
 *    their profile has bountiesPublic=true. Otherwise 403.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const founderId = searchParams.get("founderId");

    let targetId: string | null = null;
    let isOwner = false;

    if (mine) {
      const me = await getCurrentUser();
      if (!me) return NextResponse.json({ error: "No current user" }, { status: 401 });
      targetId = me.id;
      isOwner = true;
    } else if (founderId) {
      targetId = founderId;
      const founder = await db.user.findUnique({
        where: { id: founderId },
        select: { bountiesPublic: true },
      });
      if (!founder) return NextResponse.json({ error: "Founder not found" }, { status: 404 });
      if (!founder.bountiesPublic) {
        return NextResponse.json(
          { error: "This founder's bounties are private", bounties: [] },
          { status: 403 }
        );
      }
    } else {
      // default: current user
      const me = await getCurrentUser();
      if (!me) return NextResponse.json({ error: "No current user" }, { status: 401 });
      targetId = me.id;
      isOwner = true;
    }

    const offers = await db.synergyOffer.findMany({
      where: { founderId: targetId, status: "accepted" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        pitch: true,
        offer: true,
        createdAt: true,
        request: {
          // Only the card-display fields — don't pull the requester's full
          // bio/location/skills for every gathered bounty.
          select: {
            id: true,
            title: true,
            bountyType: true,
            stake: true,
            tags: true,
            status: true,
            founder: {
              select: { id: true, name: true, handle: true, title: true, avatarUrl: true, isFoundingMember: true },
            },
            project: {
              select: {
                id: true,
                name: true,
                logoMark: true,
                logoColor: true,
                logoUrl: true,
                alphaStage: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      bounties: offers,
      isOwner,
    });
  } catch (err) {
    console.error("[GET /api/bounties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
