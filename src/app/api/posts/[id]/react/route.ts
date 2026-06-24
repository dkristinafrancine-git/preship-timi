import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { POST_REACTIONS } from "@/lib/preship";
import { enqueueReaction } from "@/lib/queue";

// POST /api/posts/[id]/react
//
// Fire-and-forget-the-write model: this route validates the request and
// enqueues a job; the actual Prisma write + author notification happen in the
// background worker (src/worker/, draining the `preship_write_jobs` pgmq
// queue). The response carries the *projected* result so the client can update
// optimistically and confirm intent without waiting on the DB write.
//
// Why the client sends `desired` (not a "toggle"): the API never needs to read
// the reaction row to decide what to do, which removes a DB round trip from
// the hot path entirely. The client already knows the current UI state and
// sends the target; the worker converges to that target idempotently.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const kind = (body as { kind?: string }).kind;
    if (!kind || !(POST_REACTIONS as readonly string[]).includes(kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${POST_REACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // `desired` defaults to true (preserve backward compat for any caller that
    // only sends `kind`). When present it MUST be boolean.
    const rawDesired = (body as { desired?: unknown }).desired;
    const desired =
      rawDesired === undefined ? true : rawDesired === true;
    if (rawDesired !== undefined && typeof rawDesired !== "boolean") {
      return NextResponse.json(
        { error: "desired must be a boolean" },
        { status: 400 }
      );
    }

    // Existence check only — we don't need the author or reaction rows here;
    // the worker resolves them when it runs the job. Cheapest valid gate.
    const post = await db.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Enqueue + return immediately. We don't await the worker; the response
    // reflects the client's requested end state.
    await enqueueReaction({ postId: id, userId: user.id, kind: kind as "like" | "repost" | "handshake", desired });

    return NextResponse.json({ reacted: desired, kind });
  } catch (err) {
    console.error("[POST /api/posts/[id]/react]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
