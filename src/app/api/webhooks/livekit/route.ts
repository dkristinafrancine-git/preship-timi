import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";

/**
 * POST /api/webhooks/livekit
 *
 * LiveKit server webhook receiver. LiveKit posts server events here (configured
 * in the LiveKit dashboard) so we can record IdeaLab live-audio
 * participant-minutes. This route is PUBLIC (added to middleware PUBLIC_PREFIXES)
 * — LiveKit has no NextAuth session, so auth is the webhook signature, verified
 * with LIVEKIT_API_KEY/SECRET via WebhookReceiver. An unsigned or tampered body
 * is rejected before any DB write.
 *
 * Handled events:
 *  - participant_joined → create an IdeaLabUsage row (leftAt null).
 *  - participant_left    → close the open row (leftAt + durationSecs).
 *  - room_finished       → sweep any still-open rows for the room.
 *  - room_started / others → no-op (200 OK).
 *
 * Room-name convention: the token route names rooms "idealab-<sessionId>", and
 * the participant identity is the User.id. Non-idealab rooms are ignored. All
 * writes are idempotent against webhook retries (find-then-upsert, never blind
 * create on join; left only updates a still-open row).
 */
const IDEALAB_PREFIX = "idealab-";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      // LiveKit isn't configured — nothing to record. Acknowledge so LiveKit
      // doesn't keep retrying, but flag it in the logs.
      console.error("[POST /api/webhooks/livekit] LIVEKIT_API_KEY/SECRET not configured");
      return NextResponse.json({ ok: true });
    }

    const body = await req.text();
    // LiveKit signs with the "Authorize" header (see livekit-server-sdk
    // `authorizeHeader`). Accept either Authorize or the conventional
    // Authorization so a proxy that rewrites headers doesn't break verification.
    const authHeader = req.headers.get("authorize") ?? req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth header" }, { status: 401 });
    }

    // Verify the signature. receive() throws on a bad signature → 401.
    let event;
    try {
      const receiver = new WebhookReceiver(apiKey, apiSecret);
      event = await receiver.receive(body, authHeader);
    } catch (err) {
      console.error("[POST /api/webhooks/livekit] signature verification failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const roomName = event.room?.name;
    // Only IdeaLab rooms are tracked. Ignore anything else (defensive — another
    // feature might use LiveKit rooms under a different prefix later).
    if (!roomName || !roomName.startsWith(IDEALAB_PREFIX)) {
      return NextResponse.json({ ok: true });
    }
    const sessionId = roomName.slice(IDEALAB_PREFIX.length);

    switch (event.event) {
      case "participant_joined":
        await onParticipantJoined(sessionId, event.participant?.identity);
        break;
      case "participant_left":
        await onParticipantLeft(sessionId, event.participant?.identity);
        break;
      case "room_finished":
        await onRoomFinished(sessionId);
        break;
      default:
        // room_started, track_*, egress_*, etc. — acknowledged, no action.
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/webhooks/livekit]", err);
    // 500 — LiveKit will retry. Acceptable for transient DB errors; the writes
    // are idempotent so a retry after a partial failure is safe.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Create an open usage row for a participant. Idempotent: if an open row
 *  already exists for (sessionId, participantId) it's left as-is (a duplicate
 *  join event from a retry doesn't create a second span). The participant
 *  identity is the User.id when known; resolve it, else store userId null. */
async function onParticipantJoined(sessionId: string, identity: string | undefined) {
  if (!identity) return;
  // Idempotency: bail if there's already an open span for this participant in
  // this session (a retried webhook must not start a second row).
  const existing = await db.ideaLabUsage.findFirst({
    where: { sessionId, participantId: identity, leftAt: null },
    select: { id: true },
  });
  if (existing) return;

  // Resolve the identity to a User (the token route sets identity = user.id).
  // If no user matches (livekit-only/anonymous identity), userId stays null.
  const user = await db.user.findUnique({
    where: { id: identity },
    select: { id: true },
  });

  await db.ideaLabUsage.create({
    data: {
      sessionId,
      userId: user?.id ?? null,
      participantId: identity,
      joinedAt: new Date(),
    },
  });
}

/** Close the participant's open span: set leftAt + denormalized durationSecs.
 *  Idempotent: only updates a row that's still open; a retried left event finds
 *  nothing open and is a no-op. */
async function onParticipantLeft(sessionId: string, identity: string | undefined) {
  if (!identity) return;
  const open = await db.ideaLabUsage.findFirst({
    where: { sessionId, participantId: identity, leftAt: null },
    select: { id: true, joinedAt: true },
  });
  if (!open) return;

  const leftAt = new Date();
  const durationSecs = Math.max(
    0,
    Math.round((leftAt.getTime() - open.joinedAt.getTime()) / 1000)
  );
  await db.ideaLabUsage.update({
    where: { id: open.id },
    data: { leftAt, durationSecs },
  });
}

/** Sweep any still-open spans when the room ends — participants who never got a
 *  clean left event (dropped connection, etc.) get closed at room-finish time
 *  using their joinedAt. */
async function onRoomFinished(sessionId: string) {
  const open = await db.ideaLabUsage.findMany({
    where: { sessionId, leftAt: null },
    select: { id: true, joinedAt: true },
  });
  if (open.length === 0) return;

  const leftAt = new Date();
  // Update each row with its own denormalized duration. Batched as parallel
  // updates; the row count per room is bounded by maxSeats (8 default).
  await Promise.all(
    open.map((row) =>
      db.ideaLabUsage.update({
        where: { id: row.id },
        data: {
          leftAt,
          durationSecs: Math.max(
            0,
            Math.round((leftAt.getTime() - row.joinedAt.getTime()) / 1000)
          ),
        },
      })
    )
  );
}
