import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// CUID shape (cjq... — 24 base36 chars). Used only to reject obviously-bogus
// ids before they reach SQL; it is NOT a security boundary — the UPDATE is
// parameterized regardless.
const CUID_RE = /^[a-z0-9]{20,32}$/;
const MAX_IDS = 100;

/**
 * POST /api/feed/impressions
 *
 * Batched view-ping. The main war-room feed fires this ONCE per load with the
 * page's post ids to record an anonymous reach impression for each. This is a
 * view metric, not a reaction — it counts feed renders.
 *
 * Auth is intentionally NOT required: impressions are anonymous reach counts
 * (like ad impressions), and the public landing page also renders the feed, so
 * requiring a session would silently discard every logged-out view.
 *
 * Body: `{ postIds: string[] }` → single parameterized `UPDATE … SET
 * impressions = impressions + 1 WHERE id IN (…)`. No per-id round trips. The
 * right-rail trending fetch deliberately does NOT call this, to avoid
 * inflating counts ~2× per page view.
 *
 * Always returns 200 `{ ok: true, counted: N }` (best-effort: a view-ping
 * failing must never break the feed). Invalid/empty bodies are a quiet no-op.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: true, counted: 0 });
    }

    const raw = (body as { postIds?: unknown }).postIds;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ ok: true, counted: 0 });
    }

    // De-dup + validate + cap. Unknown ids simply won't match the IN clause,
    // but rejecting non-cuid strings early keeps the query list clean.
    const ids = Array.from(
      new Set(
        raw
          .filter((id): id is string => typeof id === "string" && CUID_RE.test(id))
      )
    ).slice(0, MAX_IDS);

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, counted: 0 });
    }

    // Parameterized IN (...) — Prisma.sql turns the array into $1, $2, … bound
    // params, so ids never touch SQL as text. One round trip for the whole page.
    await db.$executeRaw`
      UPDATE "Post"
      SET "impressions" = "impressions" + 1
      WHERE "id" IN (${Prisma.join(ids)})
    `;

    return NextResponse.json({ ok: true, counted: ids.length });
  } catch (err) {
    // Best-effort: never break the feed over a view metric. Log + 200.
    console.error("[POST /api/feed/impressions]", err);
    return NextResponse.json({ ok: true, counted: 0 });
  }
}
