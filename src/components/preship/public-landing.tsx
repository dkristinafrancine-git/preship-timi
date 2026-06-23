"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { Sidebar } from "./sidebar";
import { RightRail } from "./right-rail";
import { Footer } from "./footer";
import { FeedPost } from "./war-room/feed-post";
import { ApiErrorState } from "./api-error-state";
import { Logo } from "./logo";
import type { FeedPost as FeedPostType } from "@/lib/preship-types";
import { Loader2, Radio } from "lucide-react";
import Link from "next/link";

/**
 * Public landing page — a read-only replica of the war room for anonymous
 * visitors. No sticky header (just a slim logo bar), a limited recent feed in
 * the center, the left nav + right rail in landing mode (clicks → /login), and
 * a floating login/signup CTA ribbon pinned to the bottom that pops off the
 * feed with a heavy shadow.
 *
 * Authenticated visitors never see this: middleware redirects / → /app when a
 * session exists.
 */
export function PublicLanding() {
  // Newest posts, capped to a limited page so the landing stays light.
  const { data, loading, error, refetch } = useApi<{ posts: FeedPostType[] }>(
    "/api/feed?sort=newest"
  );
  const posts = (data?.posts ?? []).slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* slim logo bar — no auth controls, no ticker */}
      <SlimLogoBar />

      {/* 3-column grid: left nav | center feed | right rail */}
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 pb-28 pt-5 lg:px-8 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-8">
          <Sidebar mode="landing" />
          <section className="min-w-0 px-0 lg:px-0">
            <LandingFeed
              posts={posts}
              loading={loading}
              error={error}
              refetch={refetch}
            />
          </section>
          <RightRail mode="landing" />
        </div>
      </main>

      <Footer />

      <CtaRibbon />
    </div>
  );
}

/** Minimal logo-only top bar (no header controls, no live ticker). Sticky at
 *  the top with a high z-index so it stays pinned above the feed as the
 *  visitor scrolls. */
function SlimLogoBar() {
  return (
    <div className="sticky top-0 z-50 border-b border-[#0E1909]/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="Preship home">
          <Logo />
        </Link>
        <Link
          href="/login"
          className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/65 transition hover:text-[#0E1909]"
        >
          log in →
        </Link>
      </div>
    </div>
  );
}

function LandingFeed({
  posts,
  loading,
  error,
  refetch,
}: {
  posts: FeedPostType[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* view-style header, sticky just below the slim (h-16) logo bar */}
      <div className="sticky top-16 z-20 -mx-5 mb-1 border-b border-[#0E1909]/10 bg-white/95 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <Radio size={18} className="text-[#0E1909]/60" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#0E1909]">
            War Room
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
            /live-feed
          </span>
          <span className="hidden truncate font-mono text-[13px] text-[#0E1909]/55 md:inline">
            — the alpha war room, broadcasting in broad daylight
          </span>
        </div>
      </div>

      {error && posts.length === 0 ? (
        <ApiErrorState onRetry={refetch} message="Couldn't load the war room feed." />
      ) : loading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[#0E1909]/40">
          <Loader2 size={18} className="animate-spin" />
          <span className="ml-2 font-mono text-xs uppercase tracking-widest">
            loading war-room…
          </span>
        </div>
      ) : posts.length === 0 ? (
        <div className="terminal-card py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            no posts yet · be the first to ship
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <div
            key={p.id}
            id={`post-${p.id}`}
            className="rounded-lg transition-shadow duration-300"
          >
            <FeedPost post={p} />
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Floating login/signup ribbon pinned to the bottom of the viewport. Ink
 * background with a heavy upward shadow so it lifts off the feed, plus a CTA
 * line and two buttons (signup = lime primary, login = outline).
 */
function CtaRibbon() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60]">
      {/* gradient scrim so posts fade out behind the ribbon as you scroll */}
      <div
        aria-hidden
        className="pointer-events-none h-8 w-full bg-gradient-to-t from-[#0E1909] to-transparent"
      />
      <div className="border-t border-[#DAFF01]/20 bg-[#0E1909] shadow-[0_-12px_40px_rgba(14,25,9,0.45)]">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-3 px-5 py-3.5 sm:flex-row sm:justify-between lg:px-8">
          <div className="text-center sm:text-left">
            <p className="font-display text-[15px] font-semibold text-white">
              Join the <span className="text-[#DAFF01]">alpha war room.</span>
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
              broadcast · match · ideate — in broad daylight
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login?callbackUrl=/app"
              className="tactile-flat inline-flex h-10 items-center gap-1.5 rounded-md border border-white/25 px-4 font-mono text-xs font-semibold uppercase tracking-widest text-white transition hover:border-white/60 hover:bg-white/5"
            >
              log in
            </Link>
            <Link
              href="/signup"
              className="cta-lime inline-flex h-10 items-center gap-1.5 rounded-md bg-[#DAFF01] px-5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
            >
              request access →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
