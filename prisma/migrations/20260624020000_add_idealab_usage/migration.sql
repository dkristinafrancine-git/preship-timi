-- IdeaLab live-audio participant-minutes, written by LiveKit webhooks.
--
-- One row per presence span: created on participant_joined (leftAt null),
-- closed on participant_left (leftAt + durationSecs set). room_finished sweeps
-- any still-open rows. durationSecs is denormalized on leave so SUM is a plain
-- aggregate with no per-row timestamp arithmetic at read time.
--
-- sessionId FK cascades (a deleted session drops its usage). userId is nullable
-- and SET NULL on author delete — a participant row survives its user's
-- deletion so historical minutes are preserved.
--
-- participantId is the LiveKit identity (which equals User.id for known
-- joiners; livekit-only identities keep the id for dedup with userId null).

CREATE TABLE "IdeaLabUsage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "participantId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "durationSecs" INTEGER,

    CONSTRAINT "IdeaLabUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IdeaLabUsage_sessionId_idx" ON "IdeaLabUsage" ("sessionId");
CREATE INDEX "IdeaLabUsage_joinedAt_idx" ON "IdeaLabUsage" ("joinedAt");
CREATE INDEX "IdeaLabUsage_participantId_sessionId_idx" ON "IdeaLabUsage" ("participantId", "sessionId");

ALTER TABLE "IdeaLabUsage"
  ADD CONSTRAINT "IdeaLabUsage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "IdeaLabSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IdeaLabUsage"
  ADD CONSTRAINT "IdeaLabUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
