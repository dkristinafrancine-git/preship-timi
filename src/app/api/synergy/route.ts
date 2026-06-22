import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { BOUNTY_TYPES } from "@/lib/preship";

const VALID_STATUSES = ["open", "matched", "closed"];
const STAKE_BOUNTY_TYPES = BOUNTY_TYPES.filter((b) => b.needsStake).map(
  (b) => b.id
);

// GET /api/synergy — list requests, newest first
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const bountyType = searchParams.get("bountyType") ?? undefined;
    const mine = searchParams.get("mine") === "1";

    const currentUser = await getCurrentUser();

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (bountyType && BOUNTY_TYPES.some((b) => b.id === bountyType)) {
      where.bountyType = bountyType;
    }
    if (mine && currentUser) {
      where.founderId = currentUser.id;
    }

    const requests = await db.synergyRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // Bound the list; the synergy board is paginated client-side anyway.
      take: 50,
      include: {
        founder: {
          // List-card select — bio/location/skills are only rendered in the
          // detail view (see /api/synergy/[id]). Dropping them here keeps
          // list payload proportional to row count, not founder profile size.
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true, isFoundingMember: true,
          },
        },
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
        _count: { select: { offers: true } },
        offers: currentUser
          ? {
              where: { founderId: currentUser.id },
              select: {
                id: true,
                status: true,
                pitch: true,
                offer: true,
                createdAt: true,
              },
              take: 1,
            }
          : false,
      },
    });

    const result = requests.map((r) => {
      const { offers, ...rest } = r;
      return {
        ...rest,
        myOffer: offers && offers.length > 0 ? offers[0] : null,
      };
    });

    return NextResponse.json({ requests: result });
  } catch (err) {
    console.error("[GET /api/synergy]", err);
    return NextResponse.json(
      { error: "Failed to load synergy requests" },
      { status: 500 }
    );
  }
}

// POST /api/synergy — create a request as the current user
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      bottleneck,
      need,
      bountyType,
      stake,
      bountyDetail,
      tags,
      projectId,
    } = body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!bottleneck || typeof bottleneck !== "string" || !bottleneck.trim()) {
      return NextResponse.json(
        { error: "bottleneck is required" },
        { status: 400 }
      );
    }
    if (!need || typeof need !== "string" || !need.trim()) {
      return NextResponse.json({ error: "need is required" }, { status: 400 });
    }

    const validBounty = BOUNTY_TYPES.some((b) => b.id === bountyType);
    if (!validBounty) {
      return NextResponse.json(
        {
          error: `bountyType must be one of: ${BOUNTY_TYPES.map((b) => b.id).join(", ")}`,
        },
        { status: 400 }
      );
    }

    let stakeValue: number | null;
    if (STAKE_BOUNTY_TYPES.includes(bountyType)) {
      if (
        typeof stake !== "number" ||
        Number.isNaN(stake) ||
        stake <= 0 ||
        stake > 100
      ) {
        return NextResponse.json(
          {
            error: "stake must be a number between 0 and 100 for this bounty type",
          },
          { status: 400 }
        );
      }
      stakeValue = stake;
    } else {
      stakeValue = null;
    }

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { founderId: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.founderId !== currentUser.id) {
        return NextResponse.json(
          { error: "You can only attach your own project" },
          { status: 403 }
        );
      }
    }

    const created = await db.synergyRequest.create({
      data: {
        founderId: currentUser.id,
        projectId: projectId ?? null,
        title: title.trim(),
        bottleneck: bottleneck.trim(),
        need: need.trim(),
        bountyType,
        stake: stakeValue,
        bountyDetail:
          typeof bountyDetail === "string" ? bountyDetail.trim() : null,
        tags: typeof tags === "string" ? tags : null,
        status: "open",
      },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true, isFoundingMember: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
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
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/synergy]", err);
    return NextResponse.json(
      { error: "Failed to create synergy request" },
      { status: 500 }
    );
  }
}
