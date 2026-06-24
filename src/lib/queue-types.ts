/**
 * Write-job queue contract — the "schema" of what gets enqueued onto the
 * `preship_write_jobs` pgmq queue.
 *
 * This module is isomorphic (imported by both API routes that *enqueue* and
 * the worker that *dequeues*), so it must stay dependency-free — no Prisma,
 * no client-only imports. ReactionKind is re-declared here as a literal union
 * rather than imported, so the contract is self-contained and stable.
 *
 * IMPORTANT — design rule for job payloads:
 *   Encode the DESIRED END STATE, never "toggle"/"increment". The queue is
 *   durable and retries; if a job carries "flip the reaction" and runs twice
 *   (or two jobs interleave), the result diverges from intent. Carrying the
 *   absolute `desired: boolean` plus the model's existing unique constraint
 *   makes every handler a no-op-if-already-correct convergence, safe under
 *   any replay order. See `handleReact` in src/worker/handlers.ts.
 */

export type QueueReactionKind = "like" | "repost" | "handshake";

/** Set a reaction present/absent for (postId, userId, kind). */
export interface ReactJob {
  op: "react";
  postId: string;
  userId: string;
  kind: QueueReactionKind;
  /** true = ensure the reaction exists; false = ensure it's removed. */
  desired: boolean;
  /** ISO timestamp the API route observed the user's intent (for ordering / debugging). */
  at: string;
}

/** Create a Notification row (decoupled from the request path). Mirrors
 *  src/lib/notify.ts notify(userId, kind, title, body, linkView?, linkId?). */
export interface NotifyJob {
  op: "notify";
  userId: string;
  kind: string;
  title: string;
  body: string;
  linkView?: string;
  linkId?: string;
  at: string;
}

/** Discriminated union of all background jobs the worker knows how to run.
 *  Adding a new op: extend this union, add an enqueue helper in queue.ts, and
 *  add a handler in src/worker/handlers.ts. */
export type WriteJob = ReactJob | NotifyJob;

/** Row shape returned by `pgmq.read`. The message body is a JSON string that
 *  parses to a WriteJob; `msg_id` + `read_ct` drive ack/archive decisions. */
export interface PgmqMessage {
  msg_id: string;
  vt: Date;
  read_ct: number;
  enqueued_at: Date;
  message: WriteJob;
}

export const QUEUE_NAME = "preship_write_jobs";
