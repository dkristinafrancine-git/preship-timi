-- Post impressions: an anonymous reach counter incremented by the batched
-- view-ping POST /api/feed/impressions (one UPDATE per feed load over the
-- page's post ids). This is a view metric, NOT a reaction — it counts feed
-- renders (main feed only; the right-rail trending fetch deliberately does not
-- ping, to avoid inflation). Defaults to 0 so existing rows are unaffected.

ALTER TABLE "Post" ADD COLUMN "impressions" INTEGER NOT NULL DEFAULT 0;
