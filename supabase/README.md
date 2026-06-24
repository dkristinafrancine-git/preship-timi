# Supabase setup — Preship

The data layer is **PostgreSQL hosted on Supabase**, accessed through Prisma.
This doc covers everything outside the codebase: connection URLs, the Storage
bucket, Row-Level Security, and the common gotchas.

---

## 1. Connection URLs (PgBouncer poolers)

Two poolers are used. Put both in `.env` (already there):

| Env var          | Pooler            | Used by                          |
| ---------------- | ----------------- | -------------------------------- |
| `DATABASE_URL`   | transaction-mode  | Prisma Client at runtime         |
| `DIRECT_URL`     | session-mode      | `prisma migrate` / `prisma db seed` |

**Why two?** Migrations and seeding need a real dedicated session and cannot
run through PgBouncer in transaction mode. The transaction pooler
(`?pgbouncer=true&connection_limit=1`) is what the app uses at runtime — it
multiplexes many app connections over few database sessions, which is essential
under serverless/edge concurrency.

> ⚠️ **IPv4-only.** The Supabase poolers are IPv4-only. If you deploy somewhere
> with IPv6-only egress, use the direct connection string instead (slower, no
> pooling) or add an IPv4 egress.

---

## 2. Storage bucket (`media`)

File uploads (avatars, project logos, audio posts) go to a public bucket named
**`media`** in Supabase Storage, not to local disk.

Create it once (Dashboard → Storage → New bucket):

- **Name:** `media`
- **Public:** ✅ yes (objects are readable by anyone with the URL; uploads are
  still gated server-side via the service-role key in `/api/upload`).

Objects are namespaced as `media/<founderId>/<uuid>.<ext>` so each founder's
uploads group together.

The relevant env (server-only, never shipped to the client):

```
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."   # bypasses RLS — server-side only
```

---

## 3. Row-Level Security (RLS)

Apply the policies with:

```bash
# from the Supabase SQL Editor, paste the contents of supabase/rls.sql
# — or —
psql "$DIRECT_URL" -f supabase/rls.sql
```

`rls.sql` is idempotent — safe to re-run.

**What RLS does here, and what it doesn't:**

- The Next.js app connects via Prisma using the privileged `postgres` role,
  which **bypasses RLS**. So RLS does *not* gate normal app traffic — the
  authoritative authorization is `getCurrentUser()` in every API route
  (`src/lib/current-user.ts`).
- RLS is **defense-in-depth**: it governs access that arrives through
  Supabase's anon/authenticated roles (the REST API, Realtime, or a future
  client-direct integration). The policy posture is deliberately simple and
  honest about the constraints:
  - **anon/authenticated may READ** public-shareable rows (feed posts, published
    articles, open synergy, public sessions, the founder directory).
  - **anon/authenticated may NEVER WRITE.** All legitimate writes arrive through
    the API layer via the Prisma privileged role.
  - **Private data has no read policy** for anon/authenticated, so it's
    invisible to them: `Notification` (entirely opaque), and unpublished
    `Article` drafts (the article policy is `USING (published)`).

  Net effect: a leaked anon key degrades to **read-only access to public data**
  and cannot mutate anything.

- We did **not** use owner-scoped policies like `auth.uid() = authorId`, for two
  reasons: (1) authentication is NextAuth (JWT), not Supabase Auth, so
  `auth.uid()` is `NULL` for app users; and (2) primary keys are `text` (cuid)
  while `auth.uid()` returns `uuid` — they can't be compared anyway. If you
  migrate to Supabase Auth later, revisit this and switch the ids to `uuid`.

---

## 4. Day-to-day commands

```bash
npm run db:generate        # regenerate the Prisma client after schema edits
npm run db:migrate:dev     # create + apply a migration (development)
npm run db:migrate:deploy  # apply pending migrations (production / CI)
npm run db:seed            # re-run prisma/seed.ts (wipes + reseeds)
npm run db:studio          # Prisma Studio GUI against the live DB
```

---

## 5. Gotchas

### `DATABASE_URL` already exported in your shell

If your shell already has `DATABASE_URL` set (e.g. from an old session or a
profile), it will **shadow** the value in `.env` and `dotenv` will not override
it. The app will then try to connect to the stale URL.

```bash
echo $DATABASE_URL              # check the shell value
unset DATABASE_URL              # let the app read .env instead
```

If you hit *"the URL must start with `postgresql://`"* while seeding, this is
almost certainly the cause.

### Seeded founders have no password

`prisma/seed.ts` creates demo founders **without** a `passwordHash`. The
NextAuth credentials provider rejects passwordless users, so you cannot log in
as a seeded founder. Create a real account via the sign-up flow, or add
`passwordHash` values to the seed if you want demo logins.

### Query logging

Prisma query logging is off by default. Enable it for debugging with:

```bash
DEBUG_DB=1 npm run dev
```
