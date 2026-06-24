import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { POST_REACTIONS } from "@/lib/preship";
import { notify } from "@/lib/notify";

// POST /api/posts/[id]/react
//
// Synchronous write + optimistic UI. The reaction row is written inline so the
// DB is accurate the moment the request returns (a hard refresh shows the
// reaction immediately). The author notification is fired WITHOUT awaiting it
// — `notify()` is a best-effort side effect (same fire-and-forget pattern used
// for lastSeenAt in current-user.ts), so it never blocks the response or holds
// the pooled connection open.
//
// The client sends `desired` (the target state) rather than a "toggle", so the
// handler is idempotent and the route never needs an extra read to decide what
// to do — it converges to the desired state regardless of replay. The UI has
// already updated optimistically; this just makes truth match.

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

    // `desired` defaults to true (backward compat for any caller that only
    // sends `kind`). When present it MUST be boolean.
    const rawDesired = (body as { desired?: unknown }).desired;
    const desired =
      rawDesired === undefined ? true : rawDesired === true;
    if (rawDesired !== undefined && typeof rawDesired !== "boolean") {
      return NextResponse.json(
        { error: "desired must be a boolean" },
        { status: 400 }
      );
    }

    // Existence + author in one cheap read (we need authorId for the notify).
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (desired) {
      // Create; the unique constraint (postId,userId,kind) makes a duplicate a
      // no-op. `created` tells us whether to notify (exactly once per real
      // reaction, never on a replayed/duplicate request).
      let created = false;
      try {
        await db.reaction.create({ data: { postId: id, userId: user.id, kind } });
        created = true;
      } catch (e) {
        // P2002 = unique constraint = reaction already exists. Desired state is
        // satisfied; not a new reaction, so no notify.
        if (
          !(
            typeof e === "object" &&
            e !== null &&
            "code" in e &&
            (e as { code: string }).code === "P2002"
          )
        ) {
          throw e;
        }
      }

      if (created && post.authorId !== user.id) {
        // Fire-and-forget: don't let the notification write block the response
        // or hold the pooled connection across the await.
        const kindLabel =
          kind === "handshake" ? "handshake" : kind === "repost" ? "repost" : "like";
        void notify(
          post.authorId,
          "reaction",
          `${user.name} ${kindLabel}ed your post`,
          kind === "handshake"
            ? `${user.name} offered a handshake on your post.`
            : `${user.name} ${kindLabel}ed your post.`,
          "war-room",
          id
        );
      }
    } else {
      // Remove if present; missing is fine (idempotent). No notify on removal.
      await db.reaction.deleteMany({
        where: { postId: id, userId: user.id, kind },
      });
    }

    return NextResponse.json({ reacted: desired, kind });
  } catch (err) {
    console.error("[POST /api/posts/[id]/react]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
