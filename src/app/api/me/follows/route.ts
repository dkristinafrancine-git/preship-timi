import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

/**
 * GET /api/me/follows
 * Returns the founders the current user follows.
 */
export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "No current user" }, { status: 401 });

    const follows = await db.follow.findMany({
      where: { followerId: me.id },
      orderBy: { createdAt: "desc" },
      // Cap the followed-founders list; renders as a sidebar card.
      take: 100,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            bio: true,
            location: true,
            avatarUrl: true, isFoundingMember: true,
            skills: true,
          },
        },
      },
    });

    const founders = follows.map((f) => f.following);
    return NextResponse.json({ founders, count: founders.length });
  } catch (err) {
    console.error("[GET /api/me/follows]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
