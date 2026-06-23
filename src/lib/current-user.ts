import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Throttle window: only re-stamp lastSeenAt if it's older than this. Keeps a
 *  write off the hot path for back-to-back requests from the same session. */
const LAST_SEEN_STALE_MS = 60 * 1000; // 60s

/**
 * Returns the currently logged-in founder via the NextAuth session.
 *
 * Returns `null` when no session exists (callers should respond 401).
 *
 * As a side effect, stamps `User.lastSeenAt` to power the admin console's
 * active-vs-passive user stats. The stamp is throttled (only writes when the
 * stored value is missing or older than LAST_SEEN_STALE_MS) to avoid a write
 * on every request. The update is fire-and-forget — it never blocks the caller
 * and never rejects (errors are swallowed + logged, since lastSeenAt is a
 * best-effort signal, not a correctness requirement).
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (!sessionUserId) return null;
    const user = await db.user.findUnique({ where: { id: sessionUserId } });
    if (!user) return null;

    // Throttled lastSeenAt stamp. Only write when stale; the common case (a
    // request within the same minute) skips the write entirely.
    const now = Date.now();
    const seenMs = user.lastSeenAt ? user.lastSeenAt.getTime() : 0;
    if (now - seenMs > LAST_SEEN_STALE_MS) {
      void db.user
        .update({
          where: { id: user.id },
          data: { lastSeenAt: new Date(now) },
        })
        .catch((e) => console.error("[getCurrentUser · lastSeenAt stamp]", e));
    }

    return user;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
