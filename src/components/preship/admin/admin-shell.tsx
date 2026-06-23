"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/preship/logo";
import {
  ShieldCheck,
  LayoutDashboard,
  MessageSquareWarning,
  Scale,
  Users,
  AudioLines,
  ArrowLeft,
} from "lucide-react";

/**
 * Platform admin console shell — a deliberate break from the founder /app
 * workspace. Dark "command center" chrome, mono labels with code badges, and a
 * fixed set of console sections (not the founder views). The nav is
 * route-driven (active state from usePathname) since /admin uses real URL
 * segments rather than in-memory view state.
 */
const NAV: { href: string; label: string; code: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "Overview", code: "OV", icon: LayoutDashboard },
  { href: "/admin/feedback", label: "Feedback & Support", code: "FB", icon: MessageSquareWarning },
  { href: "/admin/ip-inquiries", label: "IP Inquiries", code: "IP", icon: Scale },
  { href: "/admin/users", label: "Users", code: "US", icon: Users },
  { href: "/admin/usage", label: "Audio Usage", code: "AU", icon: AudioLines },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-[#0E1909] text-white">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0E1909]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-5 lg:px-8">
          <Logo variant="on-dark" />
          <span className="ml-2 flex items-center gap-1.5 rounded-md bg-[#DAFF01]/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-[#DAFF01]">
            <ShieldCheck size={13} /> admin console
          </span>
          <div className="ml-auto">
            <Link
              href="/app"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/55 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={14} /> Back to app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1320px] flex-1 gap-8 px-5 pt-6 pb-10 lg:px-8">
        {/* left nav */}
        <aside className="sticky top-[88px] hidden h-[calc(100vh-112px)] w-[240px] shrink-0 flex-col overflow-y-auto lg:flex">
          <p className="mb-2.5 px-2 font-mono text-xs font-semibold uppercase tracking-widest text-white/35">
            Manage
          </p>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                    active
                      ? "bg-[#DAFF01] text-[#0E1909]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "transition-transform duration-150",
                      active ? "text-[#0E1909]" : "text-white/55 group-hover:scale-110"
                    )}
                  />
                  <span className="flex-1 font-display text-[15px] font-medium">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold uppercase tracking-widest",
                      active ? "text-[#0E1909]/50" : "text-white/30"
                    )}
                  >
                    {item.code}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* content */}
        <section className="min-w-0 flex-1">{children}</section>
      </main>
    </div>
  );
}
