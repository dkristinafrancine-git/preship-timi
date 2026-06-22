import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/founders/list
 * Returns all founders (lightweight) for the login quick-pick.
 *
 * NOTE: `email` is intentionally excluded — this endpoint is public and must
 * not leak founder email addresses. If a future caller needs emails, gate it
 * behind getCurrentUser().
 *
 * Fully public + quasi-static, so we export `revalidate` to engage Vercel's
 * Data Cache / edge. The `Cache-Control` header alone is NOT enough for route
 * handlers in Next 15+ — without `revalidate`, Next.js marks the route dynamic
 * and Vercel runs the function every request. With it, the response is served
 * from the edge after the first hit.
 */
export const revalidate = 60; // seconds

export async function GET() {
  try {
    const founders = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      // Cap the quick-pick list; grows with the user base otherwise.
      take: 200,
      select: {
        id: true,
        name: true,
        handle: true,
        title: true,
        avatarUrl: true, isFoundingMember: true,
      },
    });
    return NextResponse.json(
      { founders },
      // Public + quasi-static — safe to cache at the edge briefly.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[GET /api/founders/list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
