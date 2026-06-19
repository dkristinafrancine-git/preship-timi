"use client";

import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#0E1909]/10 bg-[#0E1909]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="lime" />
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-white/40 sm:inline">
              · war room for alpha-stage founders
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
            <a className="cursor-pointer transition hover:text-[#DAFF01]">manifesto</a>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">field notes</a>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">bounty terms</a>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">hosting etiquette</a>
            <span className="text-white/15">·</span>
            <a className="cursor-pointer transition hover:text-[#DAFF01]">help</a>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
            © preship · shipping in the dark, together
          </p>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/35">
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
