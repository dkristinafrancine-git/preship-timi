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

    // Handles are normalized to lowercase on signup/onboarding, so a plain
    // equality lookup hits the @@index([handle]) B-tree directly. Lowercasing
    // the input keeps lookups robust if a caller passes mixed case, without
    // paying for an insensitive (LOWER()-style) compare on every request.
    const founder = await db.user.findFirst({
      where: { handle: handle.toLowerCase() },
      select: {
        id: true,
        name: true,
        handle: true,
        title: true,
        bio: true,
        location: true,
        avatarUrl: true, isFoundingMember: true,
        skills: true,
        createdAt: true,
      },
    });
    if (!founder) return NextResponse.json({ error: "Founder not found" }, { status: 404 });

    // Both counts depend only on founder.id, not on each other — run them
    // concurrently instead of two serial round-trips through the pooler.
    const [projectCount, bountyCount] = await Promise.all([
      db.project.count({ where: { founderId: founder.id } }),
      db.synergyOffer.count({
        where: { founderId: founder.id, status: "accepted" },
      }),
    ]);

    return NextResponse.json({ founder, projectCount, bountyCount });
  } catch (err) {
    console.error("[GET /api/founders/by-handle]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
