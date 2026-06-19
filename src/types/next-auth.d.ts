import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string;
      title: string;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    handle?: string;
    title?: string;
    avatarUrl?: string | null;
  }
}
