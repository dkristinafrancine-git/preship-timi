import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detect a stale cached client: hot-reload preserves `globalThis.prisma`,
// so when the Prisma schema gains a new model (e.g. Article) the cached
// client from before that model was generated is missing the new delegate.
// We sanity-check a recent model and replace the client if it's absent.
function makeClient() {
  return new PrismaClient({ log: ['query'] })
}

let db = globalForPrisma.prisma ?? makeClient()

if (typeof (db as unknown as { article?: unknown }).article === 'undefined') {
  // Cached client predates the Article model — discard and rebuild.
  try {
    void (db as PrismaClient).$disconnect?.()
  } catch {
    // ignore disconnect errors
  }
  db = makeClient()
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export { db }


