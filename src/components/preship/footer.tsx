"use client";

import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#0E1909]/10 bg-[#0E1909]">
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="lime" />
            <span className="hidden font-mono text-xs uppercase tracking-widest text-white/40 sm:inline">
              · the alpha war room for pre-launch founders
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-widest text-white/45">
            <Link
              href="/manifesto"
              className="cursor-pointer transition hover:text-[#DAFF01]"
            >
              manifesto
            </Link>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">field notes</a>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">bounty terms</a>
            <span className="text-white/15">·</span>
            <Link
              href="/hosting-etiquette"
              className="cursor-pointer transition hover:text-[#DAFF01]"
            >
              hosting etiquette
            </Link>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">help</a>
            <span className="text-white/15">·</span>
            <Link
              href="/privacy"
              className="cursor-pointer transition hover:text-[#DAFF01]"
            >
              privacy
            </Link>
            <span className="text-white/15">·</span>
            <Link
              href="/terms"
              className="cursor-pointer transition hover:text-[#DAFF01]"
            >
              terms
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-white/35">
            © preship · the alpha war room — collaborate in broad daylight
          </p>
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-white/35">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#DAFF01]" />
              all systems nominal
            </span>
            <span className="text-white/15">·</span>
            <span>v0.1-alpha</span>
            <span className="text-white/15">·</span>
            <span>build · 2025.01</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
