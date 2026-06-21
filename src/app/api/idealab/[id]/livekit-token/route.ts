import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// Token TTL — covers a typical session with headroom. Short enough to limit
// damage if a token leaks, long enough that a host doesn't get booted mid-room.
const TOKEN_TTL_SECONDS = 60 * 60 * 2; // 2 hours

/**
 * POST /api/idealab/[id]/livekit-token
 *
 * Mints a short-lived LiveKit access token so a founder can join the live
 * audio room for an IdeaLab session.
 *
 * Admission gate (open-mic model, tied to the host's go-live button):
 *   1. Auth required (NextAuth session).
 *   2. Session must exist (404).
 *   3. Room is only joinable while `status === "live"` (409 otherwise). The
 *      host flips this via the existing PATCH { status } control, so the
 *      audio room opens/closes with go-live / end-session.
 *   4. Host (session.hostId === user.id) is always admitted.
 *      Attendees must have a signup row with status in
 *      ["confirmed","registered"] (403 otherwise).
 *
 * Everyone who's admitted gets `canPublish: true` (open mic — all joiners
 * can speak). Host additionally gets `canUpdateMetadata` for future host
 * controls.
 *
 * Returns: { token, url, roomName }
 *   - token:  LiveKit JWT (server-side only signing, client-side consumption)
 *   - url:    LIVEKIT_URL (wss://...) — safe to ship to the client
 *   - roomName: "idealab-<sessionId>" — deterministic, no collisions
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const { id } = await params;

    // --- env sanity ---
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("[POST /api/idealab/[id]/livekit-token] LiveKit env not configured");
      return NextResponse.json(
        { error: "Live audio is not configured" },
        { status: 503 }
      );
    }

    // --- session + admission ---
    const session = await db.ideaLabSession.findUnique({
      where: { id },
      select: { id: true, hostId: true, status: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Room only opens when the host goes live.
    if (session.status !== "live") {
      return NextResponse.json(
        { error: "Session is not live yet" },
        { status: 409 }
      );
    }

    const isHost = session.hostId === user.id;

    // Attendees need a valid signup. Host is auto-admitted.
    if (!isHost) {
      const signup = await db.ideaLabSignup.findUnique({
        where: { sessionId_userId: { sessionId: id, userId: user.id } },
        select: { status: true, role: true },
      });
      const allowedStatus = new Set(["confirmed", "registered"]);
      if (!signup || !allowedStatus.has(signup.status)) {
        return NextResponse.json(
          { error: "Register for this session to join the live room" },
          { status: 403 }
        );
      }
    }

    // --- mint the token ---
    const roomName = `idealab-${session.id}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      // `name` renders in LiveKit's own UI; we also mirror display fields
      // into metadata so our custom speaker tiles can render without a DB
      // lookup for every remote participant.
      name: user.name,
      // metadata is a free-text string the SDK round-trips to all clients.
      metadata: JSON.stringify({
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        title: user.title,
        role: isHost ? "host" : "participant",
      }),
      ttl: TOKEN_TTL_SECONDS,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      // Open mic: everyone who's admitted can publish + subscribe to audio.
      canPublish: true,
      canSubscribe: true,
      // Host gets metadata-write so future host controls (pin speaker, etc.)
      // work without re-issuing tokens.
      canUpdateMetadata: isHost,
      // Explicitly audio-only for IdeaLab — no video publishing.
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, url: livekitUrl, roomName });
  } catch (err) {
    console.error("[POST /api/idealab/[id]/livekit-token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
