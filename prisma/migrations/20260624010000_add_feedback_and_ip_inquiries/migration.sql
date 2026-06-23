-- Persist feedback/support + IP inquiries for the /admin console inbox.
--
-- Previously /api/feedback and /api/ip-support emailed the admin and stored
-- nothing — there was no triage history. These tables persist the same intake
-- (the routes still email in addition to writing a row). userId is nullable so
-- a row survives its author's deletion (onDelete: SetNull); IP inquiries can
-- also originate anonymous (public landing-page submissions carry no session),
-- so userId is simply null in that case and email is the reply-to.
--
-- Indexes match the console's hot queries: list-by-status (default triage view)
-- and list-by-kind (feedback vs support; tm vs © vs patent), newest first.

CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback" ("status", "createdAt");
CREATE INDEX "Feedback_kind_createdAt_idx" ON "Feedback" ("kind", "createdAt");
CREATE INDEX "Feedback_userId_idx" ON "Feedback" ("userId");

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IpInquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "protecting" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "projectName" TEXT,
    "budget" TEXT,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IpInquiry_status_createdAt_idx" ON "IpInquiry" ("status", "createdAt");
CREATE INDEX "IpInquiry_kind_createdAt_idx" ON "IpInquiry" ("kind", "createdAt");
CREATE INDEX "IpInquiry_userId_idx" ON "IpInquiry" ("userId");

ALTER TABLE "IpInquiry"
  ADD CONSTRAINT "IpInquiry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
