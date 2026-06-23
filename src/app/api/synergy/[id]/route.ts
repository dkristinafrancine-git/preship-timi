import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { BOUNTY_TYPES } from "@/lib/preship";

const VALID_STATUSES = ["open", "matched", "closed"];

// GET /api/synergy/[id] — one request with founder, project, offers + counts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const request = await db.synergyRequest.findUnique({
      where: { id },
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
        offers: {
          orderBy: { createdAt: "asc" },
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
          },
        },
        _count: { select: { offers: true } },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Synergy request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ request });
  } catch (err) {
    console.error("[GET /api/synergy/[id]]", err);
    return NextResponse.json(
      { error: "Failed to load synergy request" },
      { status: 500 }
    );
  }
}

// PATCH /api/synergy/[id] — update a request (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.synergyRequest.findUnique({
      where: { id },
      select: { founderId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Synergy request not found" },
        { status: 404 }
      );
    }

    if (existing.founderId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the request owner can update this" },
        { status: 403 }
      );
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
      status,
    } = body ?? {};

    const data: Record<string, unknown> = {};

    if (typeof title === "string") data.title = title.trim();
    if (typeof bottleneck === "string") data.bottleneck = bottleneck.trim();
    if (typeof need === "string") data.need = need.trim();
    if (typeof bountyDetail === "string")
      data.bountyDetail = bountyDetail.trim();
    if (typeof tags === "string") data.tags = tags;

    if (bountyType !== undefined) {
      if (!BOUNTY_TYPES.some((b) => b.id === bountyType)) {
        return NextResponse.json(
          {
            error: `bountyType must be one of: ${BOUNTY_TYPES.map((b) => b.id).join(", ")}`,
          },
          { status: 400 }
        );
      }
      data.bountyType = bountyType;
    }

    if (stake !== undefined) {
      if (stake === null) {
        data.stake = null;
      } else if (
        typeof stake !== "number" ||
        Number.isNaN(stake) ||
        stake <= 0 ||
        stake > 100
      ) {
        return NextResponse.json(
          { error: "stake must be a number between 0 and 100" },
          { status: 400 }
        );
      } else {
        data.stake = stake;
      }
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
    }

    const updated = await db.synergyRequest.update({
      where: { id },
      data,
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
        _count: { select: { offers: true } },
      },
    });

    return NextResponse.json({ request: updated });
  } catch (err) {
    console.error("[PATCH /api/synergy/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update synergy request" },
      { status: 500 }
    );
  }
}

// DELETE /api/synergy/[id] — delete a request (owner only)
// Prisma cascades offers via onDelete: Cascade on SynergyOffer.request.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.synergyRequest.findUnique({
      where: { id },
      select: { founderId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Synergy request not found" },
        { status: 404 }
      );
    }

    if (existing.founderId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the request owner can delete this" },
        { status: 403 }
      );
    }

    await db.synergyRequest.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/synergy/[id]]", err);
    return NextResponse.json(
      { error: "Failed to delete synergy request" },
      { status: 500 }
    );
  }
}
