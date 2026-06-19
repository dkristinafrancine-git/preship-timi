import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { notify } from "@/lib/notify";

/**
 * POST /api/follows
 * Body: { founderId } — the founder to follow.
 * Toggles: if already following, unfollows; otherwise follows.
 * Cannot follow yourself.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "No current user" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetId = (body as { founderId?: string }).founderId;
    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json({ error: "founderId is required" }, { status: 400 });
    }
    if (targetId === me.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    });

    if (existing) {
      await db.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    }

    await db.follow.create({ data: { followerId: me.id, followingId: targetId } });

    // notify the followed founder
    await notify(
      targetId,
      "follow",
      `${me.name} started following you`,
      `${me.name} is now following your founder journey.`,
      "profile",
      me.id
    );
    return NextResponse.json({ following: true });
  } catch (err) {
    console.error("[POST /api/follows]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/follows?founderId=<id>
 * Returns whether the current user follows the given founder.
 */
export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "No current user" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("founderId");
    if (!targetId) return NextResponse.json({ error: "founderId required" }, { status: 400 });
    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    });
    return NextResponse.json({ following: !!existing });
  } catch (err) {
    console.error("[GET /api/follows]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
