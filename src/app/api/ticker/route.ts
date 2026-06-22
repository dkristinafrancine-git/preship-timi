import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deriveSessionStatus } from "@/lib/preship";

/**
 * GET /api/ticker
 *
 * Lightweight cross-network signal for the header live ticker. Returns only
 * the 4 fields the ticker renders (id, kind, label, view) — no post bodies,
 * no reaction/comment counts, no founder bios, no project descriptions.
 *
 * This replaces three full-list fetches the header used to make on every page
 * load (`/api/feed?sort=newest`, `/api/synergy?status=open`,
 * `/api/idealab?status=live`), each of which pulled author/project relations
 * and `_count` aggregates just to extract a handle and a title.
 *
 * Public + cacheable: the ticker is decorative and updates on refetch.
 */
export const revalidate = 30; // seconds — Next.js data cache

export type TickerEntry = {
  id: string;
  kind: "post" | "synergy" | "session";
  view: "war-room" | "synergy" | "idealab";
  label: string;
};

export async function GET() {
  try {
    // Three independent queries in parallel — one round-trip's worth of wall
    // time through the Supabase pooler. Each is bounded to 4 rows and selects
    // only the columns needed to build the label.
    const [posts, requests, sessions] = await Promise.all([
      db.post.findMany({
        where: { type: "text" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          author: { select: { handle: true } },
          project: { select: { name: true } },
        },
      }),
      db.synergyRequest.findMany({
        where: { status: "open" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          founder: { select: { handle: true } },
        },
      }),
      db.ideaLabSession.findMany({
        // Fetch both stored-"live" and stored-"scheduled"-whose-start-has-
        // arrived; deriveSessionStatus below filters to truly-live. We can't
        // push the derived status into the DB query (it depends on now +
        // duration), so we over-fetch slightly and filter in JS. Bounded by
        // take and the session table is small.
        where: {
          OR: [
            { status: "live" },
            { status: "scheduled", scheduledAt: { lte: new Date() } },
          ],
        },
        orderBy: { scheduledAt: "asc" },
        take: 12,
        select: { id: true, title: true, status: true, scheduledAt: true, durationMins: true },
      }),
    ]);

    // Filter to truly-live after derivation (drops no-shows whose window
    // already ended, and sessions the host explicitly ended).
    const liveSessions = sessions.filter(
      (s) => deriveSessionStatus(s.status, s.scheduledAt, s.durationMins) === "live"
    ).slice(0, 4);

    const entries: TickerEntry[] = [
      ...posts.map((p) => ({
        id: p.id,
        kind: "post" as const,
        view: "war-room" as const,
        label: `@${p.author.handle} posted in ${p.project?.name ?? "general"}`,
      })),
      ...requests.map((s) => ({
        id: s.id,
        kind: "synergy" as const,
        view: "synergy" as const,
        label: `@${s.founder.handle} broadcast: ${s.title}`,
      })),
      ...liveSessions.map((s) => ({
        id: s.id,
        kind: "session" as const,
        view: "idealab" as const,
        label: `LIVE: ${s.title}`,
      })),
    ];

    return NextResponse.json(
      { entries },
      {
        headers: {
          // Public, short-TTL cache with SWR so navigations within the SPA
          // shell don't refetch the decorative ticker.
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/ticker]", err);
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
}
