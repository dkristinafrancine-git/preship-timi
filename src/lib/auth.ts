import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";

/**
 * NextAuth options for Preship.
 *
 * Credentials provider: email-only login (no password for this demo).
 * Looks up the founder by email in the DB; if found, creates a session.
 * The session exposes { id, email, name, handle, avatarUrl }.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Founder Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@preship.app" },
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
          },
        });
        if (!user) return null;

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
        token.handle = u.handle;
        token.title = u.title;
        token.avatarUrl = u.avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).handle = token.handle;
        (session.user as Record<string, unknown>).title = token.title;
        (session.user as Record<string, unknown>).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
  pages: {
    // no custom sign-in page — we use a modal
    signIn: "/",
  },
};
