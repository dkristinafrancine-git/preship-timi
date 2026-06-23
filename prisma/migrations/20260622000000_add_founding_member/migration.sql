-- Add the Founding Member badge column and backfill the first-100 cohort.
--
-- isFoundingMember is a normal boolean (default false). The backfill below
-- grants it to the first 100 users by signup order, freezing that cohort at
-- migration time. It is NOT derived at read-time — so an admin can revoke or
-- grant the badge per-user (Prisma Studio / future admin route) without code
-- changes or a deploy.

ALTER TABLE "User" ADD COLUMN "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: first 100 founders by signup timestamp.
UPDATE "User"
SET "isFoundingMember" = true
WHERE id IN (
  SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 100
);

-- Cheap cohort queries / membership counts later.
CREATE INDEX "User_isFoundingMember_idx" ON "User" ("isFoundingMember");
