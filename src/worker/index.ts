/**
 * Preship background write worker — drains `preship_write_jobs` and runs the
 * Prisma writes + side effects that the web API routes deferred to the queue.
 *
 * Runs as a SEPARATE process from Next.js (see .zscripts/worker.sh +
 * package.json `worker` / `worker:dev`). Having its own process means:
 *   - its own PgBouncer connection slot, so it never contends with the web
 *     client's single-connection pool (it *relieves* pool pressure);
 *   - a worker crash can't take down the server, and the queue's visibility
 *     timeout re-delivers any in-flight message to the next poll.
 *
 * Loop:
 *   read a batch → run each handler → ack on success, archive if read_ct is
 *   past the dead-letter threshold, else let the vt retry. Sleep briefly when
 *   the queue is empty.
 *
 * Start: `npm run worker:dev` (tsx) or `npm run worker` (compiled). Must NOT
 * be bundled into the Next server — keep it import-clean (only @/lib/db,
 * @/lib/queue, @/worker/handlers).
 */

import { ackJob, archiveJob, readJobs } from "@/lib/queue";
import type { PgmqMessage, WriteJob } from "@/lib/queue-types";
import { handleNotify, handleReact } from "@/worker/handlers";

// Tuning. Visibility timeout is the window a message is hidden after a read;
// if the worker dies mid-handle the message reappears after this many seconds
// and is retried. Keep > worst-case handler latency.
const VISIBILITY_TIMEOUT_SEC = 30;
const BATCH_SIZE = 10;
const DEAD_LETTER_READ_CT = 5; // archive after this many read attempts
const EMPTY_POLL_INTERVAL_MS = 1000;

function log(...args: unknown[]) {
  // Prefixed like the API routes' console.error("[VERB /path]") convention.
  console.log("[worker]", ...args);
}

function dispatch(job: WriteJob): Promise<void> {
  switch (job.op) {
    case "react":
      return handleReact(job);
    case "notify":
      return handleNotify(job);
    default: {
      // Exhaustiveness: a new op added to the union without a handler lands
      // here. Reject so it stays visible after vt and surfaces loudly.
      const _exhaustive: never = job;
      return Promise.reject(new Error(`Unknown job op: ${JSON.stringify(_exhaustive)}`));
    }
  }
}

async function processMessage(msg: PgmqMessage): Promise<void> {
  // Dead-letter guard: a message that's been read many times is almost
  // certainly poison (handler keeps throwing). Archive it rather than looping.
  if (msg.read_ct >= DEAD_LETTER_READ_CT) {
    log(`archiving poison message ${msg.msg_id} (read_ct=${msg.read_ct})`, msg.message);
    await archiveJob(msg.msg_id);
    return;
  }

  try {
    await dispatch(msg.message);
    await ackJob(msg.msg_id);
  } catch (err) {
    // Don't ack. The visibility timeout will make the message visible again
    // and the next poll re-reads it (read_ct climbs → eventually dead-lettered
    // above). Log once per attempt so failures aren't silent.
    console.error(
      `[worker] handler failed for ${msg.msg_id} (read_ct=${msg.read_ct}, will retry)`,
      err
    );
  }
}

async function tick(): Promise<number> {
  const messages = await readJobs(VISIBILITY_TIMEOUT_SEC, BATCH_SIZE);
  if (messages.length === 0) return 0;

  // Process sequentially. Handlers do small Prisma writes; running them in
  // parallel would borrow N pooled connections at once and re-introduce the
  // pool contention the queue exists to avoid. Throughput is fine — a batch
  // of 10 small writes completes in well under the vt.
  for (const msg of messages) {
    await processMessage(msg);
  }
  return messages.length;
}

async function main() {
  log(`draining "${"preship_write_jobs"}" (vt=${VISIBILITY_TIMEOUT_SEC}s, batch=${BATCH_SIZE}, dl=${DEAD_LETTER_READ_CT})`);

  // Graceful shutdown: SIGTERM/SIGINT (e.g. from .zscripts/start.sh cleanup)
  // flip this flag; the current tick finishes, then we exit cleanly without
  // dropping an in-flight ack.
  let stopping = false;
  const stop = (sig: string) => {
    log(`received ${sig}, draining after current tick…`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    let processed = 0;
    try {
      processed = await tick();
    } catch (err) {
      // A read-level error (DB blip) should not kill the worker — back off
      // and retry the next loop. Handler-level errors are handled per-message.
      console.error("[worker] tick failed, will retry", err);
      await sleep(EMPTY_POLL_INTERVAL_MS * 2);
      continue;
    }
    // When there's more queued work than one batch, loop immediately; only
    // sleep when the queue is drained.
    if (processed < BATCH_SIZE) {
      await sleep(EMPTY_POLL_INTERVAL_MS);
    }
  }
  log("stopped");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
