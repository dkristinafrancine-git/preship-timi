# AGENT.md — Preship engineering memory

Project-wide conventions and hard-won rules. Read this before touching the
data layer or adding an API route. Keep it updated when the structure
changes.

## Stack

- **Next.js 16** (App Router, RSC + client components) + **TypeScript** strict.
- **Prisma** over **PostgreSQL** (Supabase). Two connection strings:
  - `DATABASE_URL` → Supabase **transaction-mode pooler** (PgBouncer). Runtime queries.
  - `DIRECT_URL` → session-mode pooler. `prisma migrate` only (migrations need a real session).
- **Auth**: NextAuth v4 (Credentials provider, JWT sessions, scrypt `hashPassword`/`verifyPassword` in `src/lib/auth.ts`). Sessions verified by `src/middleware.ts` (edge) + `getCurrentUser()` (node).
- **Email**: Resend (`src/lib/email.ts`). Dev-fallback logs HTML when `RESEND_API_KEY` is unset.
- Client state: Zustand (`src/lib/preship-store.ts`), data fetch via `useApi`/`useMutate` (`src/lib/use-api.ts`).

## Database query rules (performance + security) — NON-NEGOTIABLE

These came from a real performance audit. Violating them is what makes the
app "load slow." Re-read before every new query.

### 1. Never create an N+1. Use `_count` / nested `select`, not row arrays.

**Bad** — fetches every reaction/comment row for every post, then counts in JS:
```ts
include: { reactions: { select: { id, userId, kind } }, comments: { select: { id } } }
// then: post.reactions.length, or reduce() per post
```
For 50 posts × dozens of reactions each, this ships thousands of rows just
to produce counts.

**Good** — Prisma emits one SQL `COUNT(*)` per relation; stays O(posts):
```ts
select: { ..., _count: { select: { comments: true, reactions: true } } }
```

For **per-kind breakdowns** (like reaction `like/repost/handshake` counts),
don't select all rows — run ONE grouped query across the whole page:
```ts
db.reaction.groupBy({ by: ["postId","kind"], where: { postId: { in: ids } }, _count: { _all: true } })
```
See `src/app/api/feed/route.ts` (`reactionCountsForPosts`) for the reference
pattern.

### 2. `select` ONLY the fields you render. Never rely on Prisma's default `*`.

- The default include pulls every column. On `User` that includes
  `passwordHash`, `email`, large `bio`/`skills` text, and every relation.
- Keep two named select objects and reuse them:
  - `FOUNDER_PROFILE_SELECT` — full profile fields (bio/location/skills), used ONLY on the profile header.
  - `FOUNDER_CARD_SELECT` — `{ id, name, handle, title, avatarUrl }`, used for nested relations (bounty requester, comment author, search hit).
- Never select `passwordHash` outside `src/lib/auth.ts` and `src/lib/current-user.ts`.
- Drop heavy text blobs (`Post.body`, `Post.audioWaveform`, `Article.body`)
  from list/search payloads. For previews, fetch a snippet: `body.slice(0,200)`.

### 3. Cursor pagination, not `skip`/`take`, once you paginate at scale.

`skip: N` forces Postgres to read + discard N rows before returning the page
— O(N) cost that grows with depth. Use **keyset / cursor pagination**:

```ts
// efficient — uses the (createdAt) index, constant cost per page
db.post.findMany({
  where: { createdAt: { lt: cursor } },   // cursor = last item's createdAt
  orderBy: { createdAt: "desc" },
  take: 20,
})
```

Currently the feed uses `take: 50` with no pagination (acceptable while small).
When you add "load more", do it keyset — never `skip`. The `(authorId, createdAt)`,
`(createdAt)`, and `(projectId)` indexes already exist to support this.

### 4. Parallelize independent queries with `Promise.all`.

If two+ queries don't depend on each other's results, `await` them together:
```ts
const [user, posts] = await Promise.all([getCurrentUser(), db.post.findMany(...)])
```
One network round-trip instead of N sequential ones. See `feed/route.ts`,
`founders/[id]/route.ts`. Exception: when query B's `where` depends on a
field from query A (e.g. bounties depend on `founder.bountiesPublic`),
fetch A first, then `Promise.all` the rest.

### 5. Connection pooling — runtime uses PgBouncer transaction mode.

- `DATABASE_URL` (runtime) → **transaction-mode pooler**. Each query borrows
  a pooled server connection for the duration of one transaction and returns
  it. Do NOT hold a transaction open across an `await` on external I/O
  (fetch, email, sleep) — it starves the pool and causes `too many clients`.
  Do the DB work, then the I/O.
- `DIRECT_URL` (migrations) → session-mode. `prisma migrate deploy` only.
- Prisma's interactive transactions (`db.$transaction(async tx => ...)`) are
  fine for multi-statement atomicity; keep them short.
- If you ever see "prepared statement already exists" or
  `Timed out fetching a new connection`, it's a pooler mismatch (wrong URL)
  or a held-open transaction — not a Prisma bug.

### 6. Indexes — match the query, and use trigram for ILIKE.

- **B-tree indexes** (Prisma `@@index`) accelerate exact match + prefix
  (`LIKE 'term%'`, `<`, range joins). They do NOT accelerate leading-wildcard
  `ILIKE '%term%'` — Postgres seq-scans instead.
- For any column searched with `ILIKE '%...%'` (search box, tag filter), add
  a **GIN trigram index** in a **raw SQL migration** (Prisma can't express it):
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX "Post_body_trgm_idx" ON "Post" USING gin ("body" gin_trgm_ops);
  ```
  These live in `migrations/20260621120000_add_trgm_search_indexes/`. Add new
  ones there (or a new migration) — never try to declare them in schema.prisma.
- Composite indexes should match the query's filter columns **in order**, and
  can include the sort column to avoid a separate sort step:
  `(founderId, status, createdAt DESC)` serves `WHERE founderId=? AND status=? ORDER BY createdAt DESC`.
- Don't over-index: every index slows writes. Only index columns that appear
  in a hot `WHERE`, `JOIN`, or `ORDER BY`. Low-selectivity columns
  (e.g. boolean `bountiesPublic`) usually aren't worth indexing alone.

## Security rules

- **Auth on every mutation and every non-public read.** Gate with
  `getCurrentUser()`; return 401 on null. The middleware handles the route
  gate; the handler still must confirm the *acting user is allowed to act on
  this resource* (ownership checks).
- **Verify ownership before write.** `where: { id, authorId: user.id }` —
  never `where: { id }` then trust the session. This prevents IDOR.
- **Never select `passwordHash` into a response.** It's only ever read in
  `verifyPassword()` and the credentials authorize callback.
- **Hash with scrypt** (`hashPassword`/`verifyPassword`). The stored format is
  `salt:hash`, both base64. Never store or log plaintext.
- **Sensitive actions get a human test.** Password change uses a signed
  human-test quiz (`src/lib/human-test.ts`) — the answer is never on the
  client; a signed challenge token is verified server-side with
  `timingSafeEqual`. Reuse this pattern for any future sensitive action.
- **Validate + bound all input.** Email regex, length caps (note ≤500),
  handle charset (`^[a-z0-9-]{3,20}$`). Reject early with 400.
- **Timing-safe comparisons** for secrets/tokens (`crypto.timingSafeEqual`),
  never `===` on a secret.

## API route conventions

- Every route file: `try/catch` the whole handler, `console.error("[VERB /path]", err)`,
  return `500 { error: "Internal server error" }`.
- 404 for missing resource, 400 for validation, 401 for no session, 403 for
  wrong owner, 409 for unique-constraint conflicts.
- Return the minimal payload the client renders. Shapes should match the
  TS types in `src/lib/preship-types.ts`.
- Use `NextResponse.json` (not the raw `Response`).

## File map (data layer)

```
prisma/schema.prisma                          models + Prisma-managed B-tree indexes
prisma/migrations/..._add_trgm_search_indexes/ raw GIN trigram indexes (ILIKE search)
src/lib/db.ts                                Prisma client singleton
src/lib/current-user.ts                      getCurrentUser() — session → full User row
src/lib/auth.ts                              NextAuth config, hashPassword/verifyPassword
src/middleware.ts                            edge auth gate (JWT) for all non-public routes
src/app/api/feed/route.ts                    reference for _count + batched myReaction
src/app/api/founders/[id]/route.ts           reference for Promise.all + trimmed selects
src/app/api/search/route.ts                  reference for parallel multi-model search
src/lib/human-test.ts                        signed human-test quiz + passwordStrength
```

## When you add a new table

1. Add the model to `schema.prisma`.
2. Add `@@index` for every column in a hot `WHERE`/`ORDER BY`/`JOIN`.
3. If it'll be ILIKE-searched, add a trigram GIN index in a **raw migration**.
4. `npm run db:generate` (regenerates the client) + create the migration SQL
   by hand (mirror an existing migration's shape), then `prisma migrate deploy`
   against `DIRECT_URL`.
5. Update `src/lib/preship-types.ts` with the client-facing type.
6. Add the API route following the conventions above (auth, ownership,
   trimmed `select`, parallel queries).
