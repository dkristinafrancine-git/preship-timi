# Task 5a — search-braindump-ui

**Task:** Build the Search view and Brain Dump (articles) view for the Preship Next.js 16 app.

## Files created
- `src/components/preship/search/search-view.tsx` — debounced (300ms) terminal-style search. Auto-focus input, MIN_QUERY=2 chars, fetches `/api/search?q=...`. 5 grouped sections (Founders, Projects, War-room posts, Synergy broadcasts, Brain-dump articles), each a terminal-card with SectionHeader (icon + label + count chip) and divided clickable rows. Row types: FounderRow, ProjectRow, PostRow, SynergyRow, ArticleRow. Navigation: founders→profile+founderId, projects→projects, posts→war-room+postId, synergy→synergy+synergyId, articles→brain-dump+articleId. Empty state with example chips, inline loading spinner, no-results state. ViewHeader title="Search" code="/search".
- `src/components/preship/brain-dump/brain-dump-view.tsx` — main view. Fetches `/api/articles`, single-column grid of ArticleCards. "Write article →" CTA in ViewHeader action opens editor. Card click opens detail. Honors `deepLink.articleId` (opens detail, then clearDeepLink). ViewHeader title="Brain Dump" code="/brain-dump" sub="founder-written articles · build in public".
- `src/components/preship/brain-dump/article-card.tsx` — cover-color strip + title (line-clamped) + subtitle + author row (FounderAvatar + FounderHoverCard + @handle + relative time) + tags + clap pill (lime when myClap).
- `src/components/preship/brain-dump/article-editor-dialog.tsx` — write/edit dialog. Cover-color picker (6 brand presets), title, subtitle, body Textarea (min-h-260, leading-1.7), tags input, publish Switch (default off). POST /api/articles (create) or PATCH /api/articles/[id] (edit). Save button label adapts ("publish →" vs "save draft →"). Title+body required.
- `src/components/preship/brain-dump/article-detail-dialog.tsx` — read dialog. Fetches /api/articles/[id] when open. Cover strip, mono header with draft pill, Funnel Display 2xl title, subtitle, author FounderHoverCard, whitespace-pre-wrap body, tags. Footer: clap button (POST /api/articles/[id]/clap, optimistic), author-only edit (hands off to editor via onEdit) + delete (confirm + DELETE). sr-only DialogTitle/Description.

## Files modified (minor, no schema/API changes)
- `src/lib/preship-types.ts` — added `Article` type (id, authorId, title, subtitle, body, tags, published, coverColor, createdAt, updatedAt, author with bio/location/skills for hover-card, _count.claps, myClap?).
- `src/lib/preship-store.ts` — added `articleId?: string` to `DeepLink` so search-result clicks can deep-link into Brain Dump.
- `src/lib/db.ts` — added defensive cache-invalidation check. Hot-reload preserves `globalThis.prisma`, so when the Prisma schema gains a new model (Article) the cached client predating that model is missing the new delegate. The code sanity-checks `(db as { article? }).article` and rebuilds the client if undefined. Self-heals stale caches; no-op when fresh.

## API contracts used
- `GET /api/search?q=<query>` → `{ founders, projects, posts, synergy, articles }` (5 per category). Fetches only when `q.length >= 2`.
- `GET /api/articles` → `{ articles: Article[] }` (published, with author + _count.claps).
- `GET /api/articles/[id]` → `{ article: Article }` (with author + _count.claps + myClap).
- `POST /api/articles` → create (title, subtitle?, body, tags?, published?, coverColor?).
- `PATCH /api/articles/[id]` → author-only update.
- `DELETE /api/articles/[id]` → author-only delete (cascades claps).
- `POST /api/articles/[id]/clap` → toggle, returns `{ clapped: boolean }`.

## Dev-server cache issue (resolved)
The dev server had been running for ~55 minutes — it started before the Article model was generated. Turbopack cached the OLD `@prisma/client` module in memory, so even a fresh `new PrismaClient()` was missing the `article` delegate. Confirmed via a temporary console.log. Touching + regenerating the prisma client had no effect (Turbopack doesn't watch node_modules). Triggered a full dev-server reload by adding then removing a comment in `next.config.ts` (Next.js restarts on config changes). After restart, both `/api/articles` and `/api/search` return 200 with real data. The `lib/db.ts` defensive check now reports the cached client has the article delegate.

## Verification
- `bun run lint` — clean (0 errors).
- `bunx tsc --noEmit` — no errors in any new/modified file. Only pre-existing errors remain (prisma/seed.ts, badges.tsx BountyType import, bounties-gathered.tsx, skills/, examples/).
- `curl /api/articles` → 200 with 5+ seeded articles.
- `curl /api/search?q=maya` → 200 with Maya Okafor founder hit.
- `curl /api/search?q=beta` → 200 with Kwame + Sofia founder hits.
- `curl /` → 200 (homepage compiles, no module-not-found errors for search-view or brain-dump-view).
