import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// GET /api/synergy/[id]/offers — list offers for a request
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const request = await db.synergyRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Synergy request not found" },
        { status: 404 }
      );
    }

    const offers = await db.synergyOffer.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "asc" },
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

    return NextResponse.json({ offers });
  } catch (err) {
    console.error("[GET /api/synergy/[id]/offers]", err);
    return NextResponse.json({ error: "Failed to load offers" }, { status: 500 });
  }
}

// POST /api/synergy/[id]/offers — create an offer as the current user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (request.founderId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot offer on your own request" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { pitch, offer } = body ?? {};

    if (!pitch || typeof pitch !== "string" || !pitch.trim()) {
      return NextResponse.json({ error: "pitch is required" }, { status: 400 });
    }

    // Prevent duplicate offers — return existing if already present
    const existing = await db.synergyOffer.findFirst({
      where: { requestId: id, founderId: currentUser.id },
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

    if (existing) {
      return NextResponse.json(
        { error: "You have already offered on this request", offer: existing },
        { status: 400 }
      );
    }

    const created = await db.synergyOffer.create({
      data: {
        requestId: id,
        founderId: currentUser.id,
        pitch: pitch.trim(),
        offer:
          typeof offer === "string" && offer.trim() ? offer.trim() : null,
        status: "pending",
      },
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

    return NextResponse.json({ offer: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/synergy/[id]/offers]", err);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}
