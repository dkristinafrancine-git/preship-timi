-- Platform admin console foundation.
--
-- `role` gates the /admin console (member | superadmin). It is NOT derived at
-- read-time: the first superadmin is bootstrapped from the ADMIN_EMAILS env
-- allowlist at sign-in (see src/lib/admin.ts), after which it lives on the row
-- and can be inspected/changed directly. Default "member" keeps every existing
-- founder out of the console until explicitly promoted.
--
-- `lastSeenAt` is stamped on session-bearing requests (getCurrentUser) and
-- drives the console's active-vs-passive user stats (active = seen within 7d).
-- Nullable so the column can be added without a backfill; users surface as
-- "passive" until their next session-bearing request writes a timestamp.

ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "User_role_idx" ON "User" ("role");
CREATE INDEX "User_lastSeenAt_idx" ON "User" ("lastSeenAt");
