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

    // Every query is an aggregate/groupBy — O(1) or O(distinct-values), never
    // O(rows). They run SEQUENTIALLY (not Promise.all): the prod connection pool
    // is connection_limit=1 (transaction-mode PgBouncer — see AGENT.md §5), so
    // firing many parallel queries contends for the single connection and the
    // tail ones time out (Prisma P2024). Each query is a sub-ms indexed
    // aggregate, so sequential total latency is well under the pool timeout.
    const totalUsers = await db.user.count();
    const active7d = await db.user.count({ where: { lastSeenAt: { gte: cutoff7 } } });
    const active30d = await db.user.count({ where: { lastSeenAt: { gte: cutoff30 } } });
    const foundingMembers = await db.user.count({ where: { isFoundingMember: true } });
    const projectStageGroups = await db.project.groupBy({
      by: ["alphaStage"],
      _count: { _all: true },
    });
    const totalProjects = await db.project.count();
    // One aggregate gets both the post count and the audio-duration sum — the
    // `_count` and `_sum` run in a single SQL statement.
    const postAgg = await db.post.aggregate({
      _count: { _all: true },
      _sum: { audioDuration: true },
    });
    const articlesCount = await db.article.count();
    const sessionsTotal = await db.ideaLabSession.count();
    const sessionsEnded = await db.ideaLabSession.count({ where: { status: "ended" } });
    const openFeedback = await db.feedback.count({
      where: { status: { notIn: ["resolved", "archived"] } },
    });
    const openIpInquiries = await db.ipInquiry.count({
      where: { status: { notIn: ["responded", "closed"] } },
    });
    // Live IdeaLab minutes: SUM of closed-span durationSecs (written by the
    // LiveKit webhook). Open spans (leftAt null) have no denormalized duration
    // yet, so they're excluded from the SUM and counted separately instead.
    const liveSecondsAgg = await db.ideaLabUsage.aggregate({ _sum: { durationSecs: true } });
    const liveParticipantsNow = await db.ideaLabUsage.count({ where: { leftAt: null } });

    const recordedSeconds = postAgg._sum.audioDuration ?? 0;
    const liveSeconds = liveSecondsAgg._sum.durationSecs ?? 0;
    const postsCount = postAgg._count._all;

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
