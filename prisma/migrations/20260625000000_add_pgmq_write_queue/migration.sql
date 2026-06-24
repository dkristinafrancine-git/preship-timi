-- Background write queue: Supabase Queues (pgmq).
--
-- Off-path processing for user-facing mutations. The web API routes for the
-- hot path (reactions today; comments / synergy / follows later) enqueue a
-- job here and return to the client immediately, while a separate worker
-- process (src/worker/) drains the queue and performs the Prisma writes +
-- side effects (notifications) at its own pace. This keeps web requests
-- short-lived so they stop saturating the single-connection PgBouncer pool
-- (see AGENT.md "Database query rules"), and lets the UI update optimistically
-- without waiting on the write round trip.
--
-- pgmq is a Postgres-native durable queue:
--   - visibility timeout (vt): a message read by a worker is invisible to
--     other readers until vt elapses; if the worker never acks (delete), the
--     message becomes visible again and is retried automatically — durable,
--     no hand-rolled locking.
--   - archive: moves a message to the queue's archive table (dead-letter) once
--     read_ct climbs past a threshold, so a poison message can't loop forever.
--
-- This is a raw migration because Prisma cannot express the pgmq extension or
-- its queue/table machinery in schema.prisma — same rationale as the trigram
-- (pg_trgm) indexes migration. The queue tables live in the `pgmq` schema.

-- 1) The extension. On Supabase this ships as a trusted-language extension
--    enabled from the dashboard (Database → Extensions → pgmq). CREATE
--    EXTENSION is idempotent and safe to re-run.
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 2) The queue. pgmq.create() builds the queue's backing table + archive
--    table. Idempotent: only create when it doesn't already list.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'preship_write_jobs'
  ) THEN
    PERFORM pgmq.create('preship_write_jobs');
  END IF;
END $$;

-- NOTE on `pgmq` vs `pgmq_public` schema:
--   pgmq functions are search_path-sensitive. If the DB role runs with a
--   restricted search_path that does not include `pgmq`, qualify calls as
--   `pgmq.send(...)`. The worker + enqueue helpers in src/lib/queue.ts always
--   qualify with the `pgmq` schema prefix for this reason.
