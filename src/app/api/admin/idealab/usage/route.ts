import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import type { IdeaLabUsageBreakdown } from "@/lib/preship-types";

/**
 * GET /api/admin/idealab/usage
 *
 * Per-session IdeaLab live-audio breakdown for the /admin usage page. Groups
 * IdeaLabUsage by session (one COUNT/SUM per session — no row arrays, no N+1),
 * then resolves session titles/host info in a second batched query.
 *
 * Optional `days` narrows the window to spans joined within that many days
 * (default 30). Ordered by total seconds desc.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(req.url);
    const daysRaw = Number(searchParams.get("days") ?? "30");
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // One grouped aggregate per session — O(sessions), not O(spans).
    const grouped = await db.ideaLabUsage.groupBy({
      by: ["sessionId"],
      where: { joinedAt: { gte: since } },
      _sum: { durationSecs: true },
      _count: { _all: true },
      orderBy: { _sum: { durationSecs: "desc" } },
      take: 100,
    });

    if (grouped.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Resolve session metadata for the grouped sessionIds in one query.
    const sessionIds = grouped.map((g) => g.sessionId);
    const sessions = await db.ideaLabSession.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, title: true, scheduledAt: true, status: true },
    });
    const byId = new Map(sessions.map((s) => [s.id, s]));

    const items: IdeaLabUsageBreakdown[] = grouped.map((g) => {
      const s = byId.get(g.sessionId);
      return {
        sessionId: g.sessionId,
        title: s?.title ?? "(deleted session)",
        scheduledAt: s?.scheduledAt.toISOString() ?? g.sessionId,
        status: s?.status ?? "unknown",
        // Open spans (leftAt null) have null durationSecs; treat as 0 in the sum.
        totalSeconds: g._sum.durationSecs ?? 0,
        participantSpans: g._count._all,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/admin/idealab/usage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
