-- ───────────────────────────────────────────────────────────────────────────
-- Preship — Row Level Security (defense-in-depth)
-- ───────────────────────────────────────────────────────────────────────────
--
-- Run once against the Supabase Postgres project (SQL Editor or psql).
-- Idempotent: safe to re-run.
--
-- DESIGN REALITY (read this before editing)
-- 1. The Next.js app connects via Prisma using the privileged `postgres` role,
--    which BYPASSES RLS. The authoritative authorization gate is therefore
--    `getCurrentUser()` inside each API route (src/lib/current-user.ts), NOT
--    these policies.
-- 2. Authentication is NextAuth (JWT sessions), NOT Supabase Auth. So
--    `auth.uid()` resolves to NULL for app users — there is no Supabase Auth
--    session to populate it.
-- 3. Primary keys are `text` (cuid), but `auth.uid()` returns `uuid`, so an
--    equality `auth.uid() = id` is both a type error and semantically useless
--    for this app.
--
-- CONSEQUENT POLICY POSTURE
-- RLS here is a single, well-defined defense-in-depth layer: it constrains what
-- an attacker could do IF the Supabase anon key were exposed (Supabase REST,
-- Realtime, a client-direct integration). The contract is:
--   * anon/authenticated roles may READ public-shareable rows only.
--   * anon/authenticated roles may NEVER write. All legitimate writes arrive
--     through the API layer via the Prisma privileged role.
-- This means a leaked anon key degrades to read-only access to public data and
-- cannot mutate anything — which is exactly the residual risk worth closing.
--
-- Public reads are intentionally permissive (USING (true)) because the app's
-- own data model treats these entities as public (feed, directory, published
-- articles, open synergy, public sessions). Private data (notifications,
-- article drafts) is gated to the privileged role only — it is invisible to
-- anon/authenticated by virtue of having no read policy for them.
-- ───────────────────────────────────────────────────────────────────────────

-- Postgres has no CREATE OR REPLACE POLICY, so each policy is guarded with
-- DROP IF EXISTS for idempotent re-runs.

-- ============================================================================
-- Public-read tables (anon may SELECT, nobody via anon/auth may write).
-- We attach a single read policy + rely on "no write policy ⇒ write denied"
-- (RLS denies by default once enabled).
-- ============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_read_public" ON "User";
CREATE POLICY "user_read_public" ON "User" FOR SELECT USING (true);

ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follow_read_public" ON "Follow";
CREATE POLICY "follow_read_public" ON "Follow" FOR SELECT USING (true);

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_read_public" ON "Project";
CREATE POLICY "project_read_public" ON "Project" FOR SELECT USING (true);

ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_read_public" ON "Post";
CREATE POLICY "post_read_public" ON "Post" FOR SELECT USING (true);

ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reaction_read_public" ON "Reaction";
CREATE POLICY "reaction_read_public" ON "Reaction" FOR SELECT USING (true);

ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comment_read_public" ON "Comment";
CREATE POLICY "comment_read_public" ON "Comment" FOR SELECT USING (true);

ALTER TABLE "SynergyRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "synergy_request_read_public" ON "SynergyRequest";
CREATE POLICY "synergy_request_read_public" ON "SynergyRequest" FOR SELECT USING (true);

ALTER TABLE "SynergyOffer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "synergy_offer_read_public" ON "SynergyOffer";
CREATE POLICY "synergy_offer_read_public" ON "SynergyOffer" FOR SELECT USING (true);

ALTER TABLE "IdeaLabSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_read_public" ON "IdeaLabSession";
CREATE POLICY "session_read_public" ON "IdeaLabSession" FOR SELECT USING (true);

ALTER TABLE "IdeaLabSignup" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signup_read_public" ON "IdeaLabSignup";
CREATE POLICY "signup_read_public" ON "IdeaLabSignup" FOR SELECT USING (true);

ALTER TABLE "IdeaLabInterest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "interest_read_public" ON "IdeaLabInterest";
CREATE POLICY "interest_read_public" ON "IdeaLabInterest" FOR SELECT USING (true);

ALTER TABLE "ArticleClap" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clap_read_public" ON "ArticleClap";
CREATE POLICY "clap_read_public" ON "ArticleClap" FOR SELECT USING (true);

-- ============================================================================
-- Article: only PUBLISHED rows are public. Drafts have no read policy for
-- anon/authenticated ⇒ invisible to them (only the privileged Prisma role,
-- gated by getCurrentUser() in the API, can read drafts).
-- ============================================================================
ALTER TABLE "Article" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_read_published" ON "Article";
CREATE POLICY "article_read_published" ON "Article"
  FOR SELECT USING (published);

-- ============================================================================
-- Notification: PRIVATE. No read or write policy for anon/authenticated ⇒ the
-- table is fully opaque to non-privileged roles. Notifications are only ever
-- read by the recipient, and the API enforces that via getCurrentUser().
-- (No ENABLE+policy needed to deny — RLS denies by default — but we enable it
-- explicitly so the table is never accidentally left open if defaults change.)
-- ============================================================================
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
