import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Returns the "logged in" founder.
 *
 * Priority:
 * 1. If a NextAuth session exists, return the founder by session user id.
 * 2. Otherwise, fall back to the seeded `isCurrent` user (demo mode).
 */
export async function getCurrentUser() {
  // 1. Try the NextAuth session
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (sessionUserId) {
      const user = await db.user.findUnique({ where: { id: sessionUserId } });
      if (user) return user;
    }
  } catch {
    // fall through to demo mode
  }

  // 2. Demo fallback — the seeded isCurrent user
  const fallback = await db.user.findFirst({ where: { isCurrent: true } });
  if (fallback) return fallback;

  // 3. Last resort — first user by creation order
  return db.user.findFirst({ orderBy: { createdAt: "asc" } });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
