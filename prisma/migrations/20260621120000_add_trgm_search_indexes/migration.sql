-- Performance: trigram (pg_trgm) GIN indexes for ILIKE '%...%' search.
--
-- Standard B-tree indexes CANNOT accelerate leading-wildcard ILIKE
-- (`WHERE body ILIKE '%term%'`) — Postgres has to seq-scan the whole column.
-- A GIN index with the pg_trgm operator class lets ILIKE use the index
-- instead, which is the difference between ~5ms and ~500ms once you have
-- thousands of rows.
--
-- This extension + these indexes power:
--   /api/feed?tag=...        (Post.tags ILIKE)
--   /api/search?q=...        (5 categories of ILIKE across text columns)
--
-- Created as a raw migration because Prisma can't express pg_trgm / GIN
-- trigram indexes in schema.prisma.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Posts: body / tags / audioTitle are ILIKE-scanned by feed + search.
CREATE INDEX IF NOT EXISTS "Post_body_trgm_idx"        ON "Post"      USING gin ("body"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_tags_trgm_idx"        ON "Post"      USING gin ("tags"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_audioTitle_trgm_idx"  ON "Post"      USING gin ("audioTitle"  gin_trgm_ops);

-- Articles: title / subtitle / body / tags are ILIKE-scanned by search.
CREATE INDEX IF NOT EXISTS "Article_title_trgm_idx"    ON "Article"   USING gin ("title"       gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_subtitle_trgm_idx" ON "Article"   USING gin ("subtitle"    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_body_trgm_idx"     ON "Article"   USING gin ("body"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_tags_trgm_idx"     ON "Article"   USING gin ("tags"        gin_trgm_ops);

-- Users: name / handle / title / bio / skills are ILIKE-scanned by search.
-- (handle/email already have B-tree indexes for exact lookups.)
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"        ON "User"      USING gin ("name"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_title_trgm_idx"       ON "User"      USING gin ("title"       gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_bio_trgm_idx"         ON "User"      USING gin ("bio"         gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_skills_trgm_idx"      ON "User"      USING gin ("skills"      gin_trgm_ops);

-- Projects: name / tagline / description / category / alphaStage / logoMark.
CREATE INDEX IF NOT EXISTS "Project_name_trgm_idx"     ON "Project"   USING gin ("name"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Project_tagline_trgm_idx"  ON "Project"   USING gin ("tagline"     gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Project_description_trgm_idx" ON "Project" USING gin ("description" gin_trgm_ops);

-- SynergyRequest: title / bottleneck / need / bountyDetail / tags.
CREATE INDEX IF NOT EXISTS "SynergyRequest_title_trgm_idx"        ON "SynergyRequest" USING gin ("title"        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SynergyRequest_bottleneck_trgm_idx"   ON "SynergyRequest" USING gin ("bottleneck"   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SynergyRequest_need_trgm_idx"         ON "SynergyRequest" USING gin ("need"         gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SynergyRequest_bountyDetail_trgm_idx" ON "SynergyRequest" USING gin ("bountyDetail" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SynergyRequest_tags_trgm_idx"         ON "SynergyRequest" USING gin ("tags"         gin_trgm_ops);

-- Composite index for the gathered-bounties query, which always filters on
-- (founderId, status='accepted') with an orderBy on createdAt. The existing
-- @@index([founderId, status]) covers the filter but not the sort; this one
-- covers both so the DB can serve it from the index without a sort step.
CREATE INDEX IF NOT EXISTS "SynergyOffer_founderId_status_createdAt_idx"
  ON "SynergyOffer" ("founderId", "status", "createdAt" DESC);
