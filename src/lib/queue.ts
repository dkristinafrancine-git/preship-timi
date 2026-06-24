import { db } from "@/lib/db";
import {
  QUEUE_NAME,
  type NotifyJob,
  type PgmqMessage,
  type ReactJob,
  type WriteJob,
} from "@/lib/queue-types";

/**
 * pgmq bridge — typed enqueue/read/ack helpers over Prisma `$queryRawUnsafe`.
 *
 * pgmq is a Postgres extension exposed as SQL functions (`pgmq.send`,
 * `pgmq.read`, `pgmq.delete`, `pgmq.archive`), not Prisma models, so we reach
 * for raw SQL. The `pgmq` schema is always qualified in the call to avoid
 * search_path ambiguity (see the migration comment).
 *
 * - `enqueue*` are called from API routes on the hot path (reactions). They
 *   must be fast: a single INSERT into the queue table. They never block on
 *   the eventual write — that's the worker's job.
 * - `readJobs` / `ackJob` / `archiveJob` are called only by the worker
 *   (src/worker/index.ts).
 *
 * The queue runs through the SAME transaction-mode pooler as everything else,
 * but each call is one short statement — it borrows a pooled connection,
 * returns it immediately, and never holds it across an `await` on external
 * I/O (per AGENT.md rule 5).
 */

/** Send a single job. `message` is JSON-encoded into a jsonb column. Returns
 *  the assigned msg_id ( bigint comes back as a string from $queryRawUnsafe). */
async function send(job: WriteJob): Promise<string> {
  // $queryRawUnsafe with a parameterized jsonb payload. pgmq.send returns one
  // row with a single bigint column. Casting the argument to jsonb is required
  // because pgmq.send(queue_name text, msg jsonb).
  const rows = await db.$queryRawUnsafe<{ msg_id: string | bigint }[]>(
    `SELECT pgmq.send($1::text, $2::jsonb) AS msg_id`,
    QUEUE_NAME,
    JSON.stringify(job)
  );
  const id = rows[0]?.msg_id;
  return id == null ? "" : String(id);
}

/** Enqueue a reaction desired-state job. Called by POST /api/posts/[id]/react. */
export function enqueueReaction(args: {
  postId: string;
  userId: string;
  kind: ReactJob["kind"];
  desired: boolean;
}): Promise<string> {
  const job: ReactJob = {
    op: "react",
    postId: args.postId,
    userId: args.userId,
    kind: args.kind,
    desired: args.desired,
    at: new Date().toISOString(),
  };
  return send(job);
}

/** Enqueue a notification job. Drop-in replacement for the synchronous
 *  `notify()` on hot paths — same args, decoupled from the request. */
export function enqueueNotify(args: {
  userId: string;
  kind: string;
  title: string;
  body: string;
  linkView?: string;
  linkId?: string;
}): Promise<string> {
  const job: NotifyJob = {
    op: "notify",
    userId: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    linkView: args.linkView,
    linkId: args.linkId,
    at: new Date().toISOString(),
  };
  return send(job);
}

/**
 * Read up to `qty` visible messages from the queue. A message becomes
 * invisible to other readers until `vt` (visibility timeout, seconds) elapses,
 * then auto-retries — that's the durability. `read_ct` increments each time a
 * message is read; the worker uses it to dead-letter runaway messages.
 *
 * Returns parsed WriteJob payloads. Empty array when the queue is drained.
 */
export async function readJobs(
  vtSeconds = 30,
  qty = 10
): Promise<PgmqMessage[]> {
  // pgmq.read(queue_name, vt, limit) → table(msg_id, read_ct, enqueued_at, vt, message).
  // `message` is jsonb; Prisma's raw driver hands back the parsed object for
  // jsonb via Postgres, but to be safe across drivers we treat it as unknown
  // and validate the op field at dispatch time.
  const rows = await db.$queryRawUnsafe<
    {
      msg_id: string | bigint;
      read_ct: number;
      enqueued_at: Date;
      vt: Date;
      message: unknown;
    }[]
  >(`SELECT msg_id, read_ct, enqueued_at, vt, message
       FROM pgmq.read($1::text, $2::int, $3::int)`, QUEUE_NAME, vtSeconds, qty);

  return rows.map((r) => ({
    msg_id: String(r.msg_id),
    read_ct: r.read_ct,
    enqueued_at: r.enqueued_at,
    vt: r.vt,
    message: r.message as WriteJob,
  }));
}

/** Acknowledge (permanently delete) a message after successful processing. */
export function ackJob(msgId: string): Promise<void> {
  // pgmq.delete(queue_name, msg_id bigint) returns boolean; we ignore the row.
  return db
    .$queryRawUnsafe(`SELECT pgmq.delete($1::text, $2::bigint)`, QUEUE_NAME, msgId)
    .then(() => undefined);
}

/** Move a message to the queue's archive (dead-letter) instead of letting it
 *  retry forever. The worker calls this when read_ct crosses a threshold. */
export function archiveJob(msgId: string): Promise<void> {
  // pgmq.archive(queue_name, msg_id bigint) → boolean.
  return db
    .$queryRawUnsafe(`SELECT pgmq.archive($1::text, $2::bigint)`, QUEUE_NAME, msgId)
    .then(() => undefined);
}
