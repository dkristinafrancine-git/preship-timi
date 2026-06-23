import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/admin/ip-inquiries
 *
 * Trademark / Copyright / Patent inbox list for the /admin console.
 * Cursor-paginated on createdAt desc (keyset) with optional status + kind
 * filters. Anonymous submissions (no session) carry userId=null; the stored
 * email is the reply-to and is shown for attribution in that case.
 */
const PAGE_SIZE = 25;
const VALID_STATUSES = ["new", "in-review", "responded", "closed", "all"];
const VALID_KINDS = ["trademark", "copyright", "patent", "all"];

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const kind = searchParams.get("kind") ?? "all";
    const cursorParam = searchParams.get("cursor"); // ISO createdAt of the last row

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid kind filter" }, { status: 400 });
    }

    const where = {
      ...(status !== "all" ? { status } : {}),
      ...(kind !== "all" ? { kind } : {}),
      ...(cursorParam ? { createdAt: { lt: new Date(cursorParam) } } : {}),
    };

    const rows = await db.ipInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        userId: true,
        email: true,
        kind: true,
        protecting: true,
        stage: true,
        jurisdiction: true,
        projectName: true,
        budget: true,
        details: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    // Cursor from the live Date before serialization turns it into a string.
    const nextCursor = hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ items: page, nextCursor });
  } catch (err) {
    console.error("[GET /api/admin/ip-inquiries]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
