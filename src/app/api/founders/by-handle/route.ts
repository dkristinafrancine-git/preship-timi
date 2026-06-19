import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/founders/by-handle?handle=<handle>
 * Returns a lightweight founder profile for hover cards.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle");
    if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 });

    // Case-insensitive match against the indexed handle. Handles are
    // normalized to lowercase on signup/onboarding, but insensitive matching
    // here keeps lookups robust if a caller passes mixed case.
    const founder = await db.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        handle: true,
        title: true,
        bio: true,
        location: true,
        avatarUrl: true,
        skills: true,
        createdAt: true,
      },
    });
    if (!founder) return NextResponse.json({ error: "Founder not found" }, { status: 404 });

    const projectCount = await db.project.count({ where: { founderId: founder.id } });
    const bountyCount = await db.synergyOffer.count({
      where: { founderId: founder.id, status: "accepted" },
    });

    return NextResponse.json({ founder, projectCount, bountyCount });
  } catch (err) {
    console.error("[GET /api/founders/by-handle]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
