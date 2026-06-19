import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const VALID_OFFER_STATUSES = ["accepted", "declined"];

// PATCH /api/synergy/[id]/offers/[offerId] — accept or decline an offer
// Only the request owner is allowed to do this.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id, offerId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const request = await db.synergyRequest.findUnique({
      where: { id },
      select: { id: true, founderId: true, status: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Synergy request not found" },
        { status: 404 }
      );
    }

    if (request.founderId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the request owner can accept or decline offers" },
        { status: 403 }
      );
    }

    const offer = await db.synergyOffer.findUnique({
      where: { id: offerId },
      select: { id: true, requestId: true, status: true },
    });

    if (!offer || offer.requestId !== id) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body ?? {};

    if (!VALID_OFFER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_OFFER_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (status === "accepted") {
      // Atomically: accept this offer, decline all others, mark request matched
      const [updatedOffer] = await db.$transaction([
        db.synergyOffer.update({
          where: { id: offerId },
          data: { status: "accepted" },
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
        }),
        db.synergyOffer.updateMany({
          where: { requestId: id, NOT: { id: offerId } },
          data: { status: "declined" },
        }),
        db.synergyRequest.update({
          where: { id },
          data: { status: "matched" },
          select: { id: true, status: true },
        }),
      ]);

      return NextResponse.json({
        offer: updatedOffer,
        requestStatus: "matched",
      });
    }

    // status === "declined"
    const updatedOffer = await db.synergyOffer.update({
      where: { id: offerId },
      data: { status: "declined" },
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

    return NextResponse.json({ offer: updatedOffer });
  } catch (err) {
    console.error("[PATCH /api/synergy/[id]/offers/[offerId]]", err);
    return NextResponse.json(
      { error: "Failed to update offer" },
      { status: 500 }
    );
  }
}

// DELETE /api/synergy/[id]/offers/[offerId] — withdraw an offer (offer founder only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id, offerId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const offer = await db.synergyOffer.findUnique({
      where: { id: offerId },
      select: { id: true, requestId: true, founderId: true },
    });

    if (!offer || offer.requestId !== id) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (offer.founderId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the offer founder can withdraw this offer" },
        { status: 403 }
      );
    }

    await db.synergyOffer.delete({ where: { id: offerId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/synergy/[id]/offers/[offerId]]", err);
    return NextResponse.json(
      { error: "Failed to withdraw offer" },
      { status: 500 }
    );
  }
}
