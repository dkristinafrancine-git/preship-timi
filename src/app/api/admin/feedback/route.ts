import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/admin/feedback
 *
 * Inbox list for the /admin console. Cursor-paginated on createdAt desc (keyset,
 * never skip/take — see AGENT.md §3) with optional status + kind filters.
 *
 * Renders a trimmed select: no relation row arrays, just the lightweight author
 * relation for attribution. The message body IS included (the inbox needs it to
 * triage) but the heavy text is bounded by what users submit.
 */
const PAGE_SIZE = 25;
const VALID_STATUSES = ["new", "open", "resolved", "archived", "all"];
const VALID_KINDS = ["feedback", "support", "all"];

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

    // take + 1 to detect a next page without a separate count query.
    const rows = await db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        userId: true,
        kind: true,
        category: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    // Compute the cursor from the live Date before JSON serialization turns it
    // into a string. NextResponse.json serializes Date → ISO string, so the
    // client receives createdAt as a string (matching the Feedback type).
    const nextCursor = hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ items: page, nextCursor });
  } catch (err) {
    console.error("[GET /api/admin/feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
