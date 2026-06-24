import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import type { NotifyJob, ReactJob } from "@/lib/queue-types";

/**
 * Background write-job handlers — one per `op` in the WriteJob union.
 *
 * Idempotency contract (critical): the queue is durable and retries. Every
 * handler must converge to the job's desired state regardless of how many
 * times it runs or in what order relative to siblings. Concretely:
 *   - react: ensure the reaction exists iff `desired`. The author notify
 *     fires ONLY on a genuine create THIS run — detected by attempting the
 *     insert and catching the unique-constraint (P2002) on the "already
 *     present" path, so a retried job never re-spams the notification.
 *   - notify: a Notification insert is not naturally idempotent, but a
 *     duplicate is a benign side effect; if that ever matters, dedupe by
 *     (userId, linkId, kind) within a short window.
 *
 * Each handler either resolves (→ worker acks the message) or rejects (→
 * worker leaves it for the visibility-timeout retry, eventually archived).
 */

/** Resolve a reaction job to the desired presence, notifying only on create. */
export async function handleReact(job: ReactJob): Promise<void> {
  const { postId, userId, kind, desired } = job;

  // Verify the target still exists; a reaction to a since-deleted post is a
  // no-op (cascade already cleaned it up). Mirrors the API route's guard.
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return;

  if (desired) {
    // Create; the unique constraint (postId,userId,kind) makes this the exact
    // create-vs-exists signal. A retried job hits P2002 → no notify.
    try {
      await db.reaction.create({ data: { postId, userId, kind } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Already present — desired state already satisfied. Nothing to do,
        // and crucially no duplicate notify.
        return;
      }
      throw e; // any other error → leave for retry
    }
    // Only reached on a genuine create this run.
    if (post.authorId !== userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (user) {
        const kindLabel =
          kind === "handshake" ? "handshake" : kind === "repost" ? "repost" : "like";
        await notify(
          post.authorId,
          "reaction",
          `${user.name} ${kindLabel}ed your post`,
          kind === "handshake"
            ? `${user.name} offered a handshake on your post.`
            : `${user.name} ${kindLabel}ed your post.`,
          "war-room",
          postId
        );
      }
    }
  } else {
    // Delete if present; missing is fine (idempotent). No notify on removal.
    await db.reaction.deleteMany({ where: { postId, userId, kind } });
  }
}

/** Insert a Notification row (decoupled from the request that triggered it). */
export async function handleNotify(job: NotifyJob): Promise<void> {
  await notify(job.userId, job.kind, job.title, job.body, job.linkView, job.linkId);
}
