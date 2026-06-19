import { db } from "@/lib/db";

/**
 * Returns the "logged in" founder for this demo.
 * In production this would read a session; here we use the seeded current user.
 */
export async function getCurrentUser() {
  const user = await db.user.findFirst({ where: { isCurrent: true } });
  if (!user) {
    // fall back to the first user if no current flag is set
    return db.user.findFirst({ orderBy: { createdAt: "asc" } });
  }
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
