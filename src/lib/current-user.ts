import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Returns the currently logged-in founder via the NextAuth session.
 *
 * Returns `null` when no session exists (callers should respond 401).
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (!sessionUserId) return null;
    const user = await db.user.findUnique({ where: { id: sessionUserId } });
    return user ?? null;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
