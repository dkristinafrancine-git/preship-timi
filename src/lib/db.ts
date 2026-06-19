import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Single shared PrismaClient.
 *
 * - In dev, Next.js hot-reloads re-run module code; caching the client on
 *   globalThis prevents opening a new connection pool on every reload.
 * - Query logging is expensive and noisy, so it is gated behind a DEBUG_DB
 *   env flag. Set DEBUG_DB=1 (e.g. `DEBUG_DB=1 npm run dev`) to see queries.
 * - DATABASE_URL points at the Supabase transaction-mode PgBouncer pooler
 *   (see prisma/schema.prisma). Prisma is fully compatible with PgBouncer in
 *   transaction mode when `?pgbouncer=true` is in the URL (set in .env).
 */
function makeClient() {
  return new PrismaClient(
    process.env.DEBUG_DB === '1' ? { log: ['query', 'warn', 'error'] } : { log: ['error'] }
  )
}

const db = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export { db }
