"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FounderAvatar } from "../avatars";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import type { Founder } from "@/lib/preship-types";
import { Loader2, LogIn, LogOut, ShieldCheck, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Seed founder emails shown as quick-pick options in the login modal. */
const QUICK_LOGIN = [
  "maya@preship.app",
  "dev@preship.app",
  "sofia@preship.app",
  "tobi@preship.app",
  "nina@preship.app",
  "kwame@preship.app",
  "ren@preship.app",
];

export function LoginModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: foundersData } = useApi<{ founders: Founder[] }>("/api/founders/list");
  const founders = foundersData?.founders ?? [];
  const setMe = usePreship((s) => s.setMe);
  const bump = usePreship((s) => s.bump);

  const doLogin = async (emailToUse?: string) => {
    const em = (emailToUse ?? email).trim().toLowerCase();
    if (!em) {
      toast.error("Enter your founder email");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email: em,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("No founder found with that email");
      return;
    }
    toast.success("Logged in →");
    onOpenChange(false);
    setEmail("");
    // bump the store so all components refetch with the new session
    setTimeout(() => bump(), 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Founder Login
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            sign in as any seeded founder · demo mode
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {session && (
            <div className="rounded-md border border-[#6f8a3e] bg-[#f4ffd6] px-3 py-2.5">
              <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60">
                currently signed in as
              </p>
              <p className="mt-0.5 font-display text-sm font-semibold text-[#0E1909]">
                {session.user?.name}
              </p>
            </div>
          )}

          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLogin();
              }}
              placeholder="maya@preship.app"
              className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          <Button
            onClick={() => doLogin()}
            disabled={loading}
            className="cta-lime h-10 w-full bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            sign in
          </Button>

          {/* Quick-pick founders */}
          <div>
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              or quick-pick a founder
            </p>
            <div className="grid grid-cols-1 gap-1">
              {founders.length === 0
                ? QUICK_LOGIN.map((em) => (
                    <button
                      key={em}
                      onClick={() => doLogin(em)}
                      disabled={loading}
                      className="tactile-flat flex items-center gap-2.5 rounded-md border border-[#0E1909]/10 bg-white px-3 py-2 text-left hover:border-[#0E1909]/30 disabled:opacity-50"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0E1909] font-mono text-xs font-bold text-[#DAFF01]">
                        {em[0].toUpperCase()}
                      </span>
                      <span className="flex-1 font-mono text-xs text-[#0E1909]/70">{em}</span>
                      <LogIn size={12} className="text-[#0E1909]/40" />
                    </button>
                  ))
                : founders
                    .filter((f) => QUICK_LOGIN.includes(f.email))
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => doLogin(f.email)}
                        disabled={loading}
                        className="tactile-flat flex items-center gap-2.5 rounded-md border border-[#0E1909]/10 bg-white px-3 py-2 text-left hover:border-[#0E1909]/30 disabled:opacity-50"
                      >
                        <FounderAvatar founder={f} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-xs font-semibold text-[#0E1909]">
                            {f.name}
                          </p>
                          <p className="truncate font-mono text-[11px] text-[#0E1909]/50">
                            {f.email}
                          </p>
                        </div>
                        <LogIn size={12} className="text-[#0E1909]/40" />
                      </button>
                    ))}
            </div>
          </div>

          {session && (
            <Button
              onClick={() => {
                signOut({ redirect: false });
                toast.success("Signed out →");
                onOpenChange(false);
                setTimeout(() => bump(), 200);
              }}
              variant="outline"
              className="w-full border-[#0E1909]/20 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60 hover:text-[#e0463c]"
            >
              <LogOut size={13} /> sign out
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Header auth button — shows "Log in" or the current user with a dropdown. */
export function AuthButton({
  onOpenLogin,
}: {
  onOpenLogin: () => void;
}) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const bump = usePreship((s) => s.bump);

  if (status === "loading") {
    return (
      <Button size="sm" disabled className="h-9 border border-[#0E1909] bg-[#0E1909] font-mono text-xs uppercase tracking-widest text-white">
        <Loader2 size={13} className="animate-spin" />
      </Button>
    );
  }

  if (!session) {
    return (
      <Button
        size="sm"
        onClick={onOpenLogin}
        className="cta-ink h-9 border border-[#0E1909] bg-[#0E1909] font-mono text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#0E1909]/90"
      >
        <LogIn size={13} /> Log in
      </Button>
    );
  }

  // logged in — show avatar + name with a dropdown
  const user = session.user as { name?: string; handle?: string; avatarUrl?: string | null };
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="tactile-flat flex items-center gap-2 rounded-md border border-[#0E1909]/15 bg-white px-2 py-1.5 hover:border-[#0E1909]/30"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name ?? ""} className="h-6 w-6 rounded-md object-cover" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0E1909] font-mono text-xs font-bold text-[#DAFF01]">
            {(user.name ?? "?")[0]}
          </span>
        )}
        <span className="hidden font-display text-xs font-semibold text-[#0E1909] sm:inline">
          {user.name?.split(" ")[0]}
        </span>
        <ChevronDown size={12} className={cn("text-[#0E1909]/40 transition-transform", menuOpen && "rotate-180")} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-[#0E1909]/15 bg-white py-1 shadow-[0_8px_24px_rgba(14,25,9,0.12)]">
            <div className="border-b border-[#0E1909]/8 px-3 py-2">
              <p className="truncate font-display text-xs font-semibold text-[#0E1909]">{user.name}</p>
              <p className="truncate font-mono text-[11px] text-[#0E1909]/50">@{user.handle}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ redirect: false });
                toast.success("Signed out →");
                setTimeout(() => bump(), 200);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs uppercase tracking-widest text-[#0E1909]/60 hover:bg-[#f8f9f3] hover:text-[#e0463c]"
            >
              <LogOut size={12} /> sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
