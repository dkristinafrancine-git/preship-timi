import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route protection + public landing routing.
 *
 * Public routes (no auth required):
 *  - `/`            the landing page (war-room feed replica). An authenticated
 *                   visitor is bounced to `/app` so they skip straight to the
 *                   workspace; the query string is preserved so legacy
 *                   `/?founder=<id>` deep-links still work once forwarded.
 *  - `/login`,`/signup`  auth pages.
 *  - `/api/auth/*`, `/_next/*`, static assets.
 *  - The read-only GET endpoints backing the landing page (feed, ticker,
 *    leaderboards, synergy/projects/idealab lists). These already return
 *    null-safe data for anonymous callers and emit public Cache-Control.
 *    Write handlers on the same paths self-protect with a 401 on a missing
 *    session, so opening the path prefix does NOT expose mutations.
 *
 * Everything else requires a NextAuth session token; without one we redirect
 * to /login?callbackUrl=<original-path>. Authenticated users hitting /login or
 * /signup are bounced to /app.
 *
 * `NEXTAUTH_SECRET` (already required by NextAuth in production) decrypts the
 * JWT, so no extra env is needed.
 */

const PUBLIC_PATHS = ["/", "/login", "/signup"];

// path prefixes that are always public (read-only / asset / auth-handler)
const PUBLIC_PREFIXES = [
  "/api/auth/", // NextAuth handlers (signin, signout, csrf, etc.)
  "/_next/", // Next internals
  "/favicon", // favicon.svg / favicon.ico
  "/logo_preship.svg",
  "/upload/",
  "/download/",
  // Read-only list/detail GET endpoints the public landing page renders.
  // Their POST/PATCH/DELETE handlers reject anonymous callers with 401, so
  // exposing the prefix only allows reads (no per-user fields leak — they
  // gracefully return null for unauthenticated requests).
  "/api/feed",
  "/api/ticker",
  "/api/founders/top",
  "/api/founders/list",
  "/api/founders/by-handle",
  "/api/synergy",
  "/api/projects",
  "/api/idealab",
  // IP-support intake form — public so anonymous visitors on the landing page
  // can request Trademark/Copyright/Patent help. The handler attaches the
  // founder's identity only when a session exists; otherwise an email is
  // required and used as the reply-to.
  "/api/ip-support",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Logged-in user viewing an auth page → send to the workspace.
  if (token && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Authenticated visitor on the landing page → go to the app. Preserve the
  // query string so a legacy `/?founder=<id>` share link still deep-links.
  if (token && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    // keep search as-is (e.g. ?founder=...)
    return NextResponse.redirect(url);
  }

  // Not logged in and hitting a protected route → /login with callback.
  if (!token && !isPublic(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(req.nextUrl.pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on app routes and API Routes — NOT on static assets.
  //
  // The negative lookahead excludes:
  //   - Next internals:        _next/*
  //   - NextAuth handlers:     api/auth/*
  //   - ANY file in /public:   paths containing a "." (favicon.svg,
  //                            logo_preship.svg, auth-bg-img.avif, robots.txt,
  //                            etc.). Route paths never contain a ".", so this
  //                            safely matches every public asset without
  //                            hardcoding filenames — which previously caused
  //                            new public assets (e.g. the auth background) to
  //                            be redirected to /login by the auth gate.
  matcher: ["/((?!_next/static|_next/image|api/auth|.*\\..*).*)"],
};
