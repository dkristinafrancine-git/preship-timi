import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { ensureAdminRole, ADMIN_ROLE, MEMBER_ROLE } from "@/lib/admin";

/**
 * Hash a plaintext password using scrypt with a random 16-byte salt.
 * Returns `salt:hash` (both hex) for storage in the User.passwordHash column.
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` string
 * produced by hashPassword(). Returns false if either side is malformed
 * or the hashes do not match. Uses timingSafeEqual to avoid leaking
 * timing information.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep <= 0 || sep === stored.length - 1) return false;
  const salt = Buffer.from(stored.slice(0, sep), "hex");
  const expectedHash = Buffer.from(stored.slice(sep + 1), "hex");
  if (salt.length === 0 || expectedHash.length === 0) return false;

  const actualHash = scryptSync(plain, salt, expectedHash.length);
  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
}

/**
 * NextAuth options for Preship.
 *
 * Credentials provider:
 * - Email + password are required.
 * - The password is verified against the scrypt `salt:hash` stored in
 *   User.passwordHash. A user without a passwordHash cannot log in.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Founder Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@preship.app" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true,
            passwordHash: true,
          },
        });
        if (!user) return null;

        // Reject login if the user has no password hash (no email-only login).
        if (!user.passwordHash) return null;

        const password = credentials?.password;
        if (!password) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // custom fields passed through
          handle: user.handle,
          title: user.title,
          avatarUrl: user.avatarUrl,
        } as unknown as { id: string; email: string; name: string };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          email: string;
          name: string;
          handle: string;
          title: string;
          avatarUrl: string | null;
        };
        token.id = u.id;
        token.email = u.email;
        token.handle = u.handle;
        token.title = u.title;
        token.avatarUrl = u.avatarUrl;
        // Bootstrap the superadmin role from the ADMIN_EMAILS allowlist on
        // sign-in. The role then rides on the token for the session lifetime
        // so handlers/middleware/the client can check it without a DB hit.
        token.role = await ensureAdminRole({ userId: u.id, email: u.email });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).handle = token.handle;
        (session.user as Record<string, unknown>).title = token.title;
        (session.user as Record<string, unknown>).avatarUrl = token.avatarUrl;
        (session.user as Record<string, unknown>).role =
          (token.role as string | undefined) ?? MEMBER_ROLE;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
