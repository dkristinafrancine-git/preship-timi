import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, activeSince } from "@/lib/admin";
import type { AdminStats } from "@/lib/preship-types";

/**
 * GET /api/admin/stats
 *
 * Platform overview numbers for the /admin console. One route, every query is a
 * COUNT/aggregate/groupBy — no row arrays, no N+1 (see AGENT.md §1/§2). The
 * independent aggregates run in parallel via Promise.all so this is one DB
 * round-trip's worth of latency.
 *
 * Active vs passive: "active" = lastSeenAt within the window (7d default,
 * 30d also reported). lastSeenAt is stamped on session-bearing requests by
 * getCurrentUser (throttled), so users who have never had a session-bearing
 * request since the column shipped simply have null and count as passive.
 *
 * Audio minutes: SUM of audio-post durations (Post.audioDuration, in seconds).
 * Live IdeaLab minutes arrive in Phase 5 (LiveKit webhooks → IdeaLabUsage).
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const cutoff7 = activeSince(7);
    const cutoff30 = activeSince(30);

    // Every branch is an aggregate/groupBy — O(1) or O(distinct-values), never
    // O(rows). They're independent, so fan them out in one round-trip.
    const [
      totalUsers,
      active7d,
      active30d,
      foundingMembers,
      projectStageGroups,
      totalProjects,
      postsCount,
      articlesCount,
      audioSecondsAgg,
      sessionsTotal,
      sessionsEnded,
      openFeedback,
      openIpInquiries,
      liveSecondsAgg,
      liveParticipantsNow,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { lastSeenAt: { gte: cutoff7 } } }),
      db.user.count({ where: { lastSeenAt: { gte: cutoff30 } } }),
      db.user.count({ where: { isFoundingMember: true } }),
      db.project.groupBy({ by: ["alphaStage"], _count: { _all: true } }),
      db.project.count(),
      db.post.count(),
      db.article.count(),
      // SUM returns a number; null audioDuration rows contribute null and are
      // coerced to 0 by `_sum` returning null when no rows — handle below.
      db.post.aggregate({ _sum: { audioDuration: true } }),
      db.ideaLabSession.count(),
      db.ideaLabSession.count({ where: { status: "ended" } }),
      db.feedback.count({ where: { status: { notIn: ["resolved", "archived"] } } }),
      db.ipInquiry.count({ where: { status: { notIn: ["responded", "closed"] } } }),
      // Live IdeaLab minutes: SUM of closed-span durationSecs (written by the
      // LiveKit webhook). Open spans (leftAt null) have no denormalized duration
      // yet, so they're excluded from the SUM and counted separately instead.
      db.ideaLabUsage.aggregate({ _sum: { durationSecs: true } }),
      db.ideaLabUsage.count({ where: { leftAt: null } }),
    ]);

    const recordedSeconds = audioSecondsAgg._sum.audioDuration ?? 0;
    const liveSeconds = liveSecondsAgg._sum.durationSecs ?? 0;

    const stats: AdminStats = {
      users: {
        total: totalUsers,
        active7d,
        active30d,
        foundingMembers,
      },
      projects: {
        total: totalProjects,
        byStage: projectStageGroups.map((g) => ({ stage: g.alphaStage, count: g._count._all })),
      },
      content: { posts: postsCount, articles: articlesCount },
      audio: {
        recordedMinutes: Math.round(recordedSeconds / 60),
        liveMinutes: Math.round(liveSeconds / 60),
        liveParticipants: liveParticipantsNow,
      },
      sessions: { total: sessionsTotal, ended: sessionsEnded },
      inbox: { openFeedback, openIpInquiries },
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
