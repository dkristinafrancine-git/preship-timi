import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route protection.
 *
 * - Public routes (no auth required): /login, /signup, /api/auth/*, the
 *   Next.js internals (_next), and static assets.
 * - Every other route requires a NextAuth session token; without one we
 *   redirect to /login?callbackUrl=<original-path>.
 * - Authenticated users hitting /login or /signup are bounced to / so they
 *   don't see the auth pages once they have a session.
 *
 * `NEXTAUTH_SECRET` (already required by NextAuth in production) is used to
 * decrypt/verify the JWT, so no extra env is needed.
 */

const PUBLIC_PATHS = ["/login", "/signup"];

// path prefixes that are always public
const PUBLIC_PREFIXES = [
  "/api/auth/", // NextAuth handlers (signin, signout, csrf, etc.)
  "/_next/", // Next internals
  "/favicon", // favicon.svg / favicon.ico
  "/logo_preship.svg",
  "/upload/",
  "/download/",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Logged-in user viewing an auth page → send to the app.
  if (token && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Not logged in and hitting a protected route → /login with callback.
  if (!token && !isPublic(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything EXCEPT Next internals, static asset files, and the
  // NextAuth API routes (covered by PUBLIC_PREFIXES, but matcher avoids
  // running the edge function on trivial asset requests at all).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo_preship.svg|upload|download|api/auth).*)",
  ],
};
