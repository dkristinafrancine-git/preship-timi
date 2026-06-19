import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/founders/list
 * Returns all founders (lightweight) for the login quick-pick.
 */
export async function GET() {
  try {
    const founders = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        title: true,
        avatarUrl: true,
      },
    });
    return NextResponse.json({ founders });
  } catch (err) {
    console.error("[GET /api/founders/list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
