"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "../logo";
import { usePreship } from "@/lib/preship-store";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, ArrowRight, Check, ShieldCheck } from "lucide-react";

/**
 * Shared auth form used by /login and /signup.
 *
 * `mode` locks the form to one flow (so each route has a clear purpose and
 * URL). On login it honors ?callbackUrl=; on signup it reads ?invite=<token>
 * (from an invite email) and forwards it to the signup API so the invite can
 * be marked accepted.
 *
 * Layout: a two-column terminal card — left ink "brand panel" with logo +
 * tagline + feature ticks, right form. Collapses to a single stacked card on
 * mobile.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const bump = usePreship((s) => s.bump);

  const callbackUrl = search.get("callbackUrl") || "/";
  const inviteToken = search.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupHandle, setSignupHandle] = useState("");
  const [loading, setLoading] = useState(false);

  // If we arrived via an invite link, surface it so the founder knows.
  const [inviteAccepted, setInviteAccepted] = useState(false);
  useEffect(() => {
    setInviteAccepted(!!inviteToken);
  }, [inviteToken]);

  const isSignup = mode === "signup";

  async function doLogin() {
    const em = email.trim().toLowerCase();
    if (!em) {
      toast.error("Enter your email");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email: em,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid credentials");
      return;
    }
    toast.success("Logged in →");
    bump();
    router.push(callbackUrl);
    router.refresh();
  }

  async function doSignup() {
    const em = email.trim().toLowerCase();
    const pw = password.trim();
    const name = signupName.trim();
    const handle = signupHandle.trim().toLowerCase();
    if (!em || !pw || !name || !handle) {
      toast.error("Fill in all fields");
      return;
    }
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!/^[a-z0-9-]{3,20}$/.test(handle)) {
      toast.error("Handle must be 3-20 chars: lowercase, numbers, dashes");
      return;
    }
    setLoading(true);

    // 1. create the account (forward the invite token if present)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password: pw, name, handle, inviteToken }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error((json as { error?: string }).error ?? "Signup failed");
      return;
    }

    // 2. sign in with the new credentials
    const signInRes = await signIn("credentials", {
      email: em,
      password: pw,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) {
      toast.error("Account created but login failed — try logging in.");
      router.push("/login");
      return;
    }

    bump();
    toast.success("Account created → onboarding");
    // New founders always go through onboarding first.
    router.push("/onboarding");
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSignup) doSignup();
    else doLogin();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[920px] flex-col justify-center px-5 py-10 lg:px-8">
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[#0E1909]/15 bg-white shadow-[0_8px_30px_rgba(14,25,9,0.08)] md:grid-cols-2">
        {/* ---------- left: ink brand panel ---------- */}
        <div className="relative flex flex-col justify-between bg-[#0E1909] p-7 text-white lg:p-9">
          <div>
            <Link href="/" className="inline-block">
              <Logo variant="on-dark" />
            </Link>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#DAFF01]/60">
              {isSignup ? "join the alpha war room" : "welcome back, founder"}
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight lg:text-[28px]">
              {isSignup ? (
                <>
                  Build in <span className="text-[#DAFF01]">broad daylight.</span>
                </>
              ) : (
                <>
                  The war room is <span className="text-[#DAFF01]">live.</span>
                </>
              )}
            </h1>
            <p className="mt-3 max-w-[34ch] font-display text-sm leading-relaxed text-white/65">
              {isSignup
                ? "Broadcast bottlenecks, match collaborators in Synergy, and ideate in invite-only IdeaLab rooms."
                : "Sign in to broadcast, match, and ideate with pre-launch founders trading leverage."}
            </p>
          </div>

          <ul className="mt-8 space-y-2.5">
            {[
              "War room feed — alpha updates in real time",
              "Synergy — broadcast a bottleneck, get a handshake",
              "IdeaLab — invite-only ideation rooms",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 font-mono text-xs text-white/70">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#DAFF01] text-[#0E1909]">
                  <Check size={10} strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
            the alpha war room — collaborate in broad daylight
          </p>
        </div>

        {/* ---------- right: form ---------- */}
        <div className="flex flex-col p-7 lg:p-9">
          {/* form header strip */}
          <div className="mb-6 flex items-center gap-2 border-b border-[#0E1909]/8 pb-4">
            <ShieldCheck size={16} className="text-[#0E1909]" />
            <h2 className="font-display text-base font-semibold text-[#0E1909]">
              {isSignup ? "Create your founder account" : "Founder login"}
            </h2>
          </div>

          {isSignup && inviteAccepted && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md border border-[#6f8a3e] bg-[#f4ffd6] px-3 py-2.5">
              <Check size={14} className="mt-0.5 shrink-0 text-[#0E1909]" />
              <p className="font-mono text-xs leading-relaxed text-[#0E1909]/75">
                You were invited — your invite will be marked accepted when
                you finish signing up.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-1 flex-col">
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    name
                  </Label>
                  <Input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Maya Okafor"
                    autoComplete="name"
                    className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    handle
                  </Label>
                  <Input
                    value={signupHandle}
                    onChange={(e) =>
                      setSignupHandle(
                        e.target.value.toLowerCase().replace(/\s/g, "")
                      )
                    }
                    placeholder="maya"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
                  />
                </div>
              </div>
            )}

            <div className={isSignup ? "mt-4" : ""}>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@preship.app"
                autoComplete="email"
                autoCapitalize="none"
                className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>

            <div className="mt-4">
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "min 6 characters" : "••••••••"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="cta-lime mt-6 h-10 w-full bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSignup ? (
                <UserPlus size={14} />
              ) : (
                <LogIn size={14} />
              )}
              {isSignup ? "create account →" : "sign in"}
            </Button>
          </form>

          {/* cross-link to the other auth page */}
          <div className="mt-6 border-t border-[#0E1909]/8 pt-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
              {isSignup ? "already a founder?" : "new to Preship?"}{" "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-semibold text-[#0E1909] underline-offset-2 hover:underline"
              >
                {isSignup ? "log in" : "request access"}
                <ArrowRight size={11} className="ml-0.5 inline" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/35">
        Preship · alpha war room
      </p>
    </div>
  );
}
