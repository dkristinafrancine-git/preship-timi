"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePreship } from "@/lib/preship-store";
import { Logo } from "../logo";
import { SkillsEditor } from "../profile/skills-editor";
import { AvatarUpload } from "../profile/avatar-upload";
import { TerminalHeader } from "../badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Founder } from "@/lib/preship-types";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  Sparkles,
  Camera,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Onboarding wizard — full-screen overlay shown when a signed-up founder
 * has `onboarded === false && title === ""`.
 *
 * 4 steps:
 *   1. name + handle (validated: name non-empty, handle 3-20 alnum+dash)
 *   2. title + bio + location
 *   3. skills (tag editor)
 *   4. avatar upload
 *
 * Final step POSTs to /api/onboarding with all collected data, then bumps
 * the store so /api/me refetches and the wizard dismisses itself.
 */

const HANDLE_RE = /^[a-z0-9-]{3,20}$/;
const TOTAL_STEPS = 4;

type StepMeta = {
  id: number;
  title: string;
  hint: string;
  icon: typeof User;
};

const STEPS: StepMeta[] = [
  {
    id: 1,
    title: "Identity",
    hint: "What should we call you?",
    icon: User,
  },
  {
    id: 2,
    title: "Background",
    hint: "What are you building, and from where?",
    icon: Briefcase,
  },
  {
    id: 3,
    title: "Skillsets",
    hint: "What can you actually help with?",
    icon: Sparkles,
  },
  {
    id: 4,
    title: "Avatar",
    hint: "Put a face to the handle.",
    icon: Camera,
  },
];

export function OnboardingWizard({ user }: { user: Founder }) {
  const bump = usePreship((s) => s.bump);
  const setMe = usePreship((s) => s.setMe);
  const router = useRouter();

  // pre-fill name/handle from the user prop (e.g. signup just created them)
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name ?? "");
  const [handle, setHandle] = useState(user.handle ?? "");
  const [title, setTitle] = useState(user.title ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [skills, setSkills] = useState<string[]>(
    user.skills ? user.skills.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 validation
  const nameError = name.trim().length === 0 ? "name is required" : "";
  const handleNorm = handle.trim().toLowerCase();
  const handleError = !handleNorm
    ? "handle is required"
    : !HANDLE_RE.test(handleNorm)
    ? "3-20 chars · alphanumeric or dash · lowercase"
    : "";
  const step1Valid = !nameError && !handleError;

  const canContinue = (() => {
    if (step === 1) return step1Valid;
    // steps 2-4 are optional — always continuable
    return true;
  })();

  const next = () => {
    if (!canContinue) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handleNorm,
          title: title.trim(),
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          skills,
          avatarUrl: avatarUrl || undefined,
        }),
      });
      const json = (await r.json().catch(() => ({}))) as
        | { user?: Founder; error?: string }
        | Record<string, never>;
      if (!r.ok) {
        const msg = (json as { error?: string }).error ?? `HTTP ${r.status}`;
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      const updated = (json as { user: Founder }).user;
      if (updated) setMe(updated);
      toast.success("Onboarding complete → welcome to the war room");
      // bump the store so every useApi consumer refetches (incl. /api/me),
      // then head to the app (we're on /onboarding now, not an overlay).
      bump();
      router.push("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const currentStep = STEPS.find((s) => s.id === step)!;
  const StepIcon = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding wizard"
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col px-5 py-8 lg:px-8 lg:py-12">
        {/* Logo + tagline */}
        <header className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[#0E1909]">
            Welcome to the Alpha War Room
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
            4 quick steps · then you can broadcast
          </p>
        </header>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isDone = s.id < step;
              const isActive = s.id === step;
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className="flex flex-1 items-center"
                  aria-hidden={isActive ? undefined : true}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs font-bold transition",
                        isActive &&
                          "border-[#0E1909] bg-[#DAFF01] text-[#0E1909] shadow-[0_2px_8px_rgba(14,25,9,0.10)]",
                        isDone &&
                          "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]",
                        !isActive &&
                          !isDone &&
                          "border-[#0E1909]/15 bg-white text-[#0E1909]/35"
                      )}
                    >
                      {isDone ? <Check size={14} /> : <Icon size={15} />}
                    </div>
                    <span
                      className={cn(
                        "hidden font-mono text-[10px] font-semibold uppercase tracking-widest sm:block",
                        isActive ? "text-[#0E1909]" : "text-[#0E1909]/40"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 h-[2px] flex-1 rounded-full transition-colors",
                        s.id < step ? "bg-[#0E1909]" : "bg-[#0E1909]/12"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
            step {step} of {TOTAL_STEPS} · {currentStep.hint}
          </p>
        </div>

        {/* Step card */}
        <div className="terminal-card flex flex-1 flex-col">
          <TerminalHeader
            label={`onboarding · step ${step}`}
            right={
              <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                {currentStep.title}
              </span>
            }
          />

          <div className="flex flex-1 flex-col p-5 lg:p-6">
            {/* Step header */}
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#DAFF01]">
                <StepIcon size={18} className="text-[#0E1909]" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold tracking-tight text-[#0E1909]">
                  {currentStep.title}
                </h2>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                  {currentStep.hint}
                </p>
              </div>
            </div>

            {/* Step 1 — name + handle */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && step1Valid) next();
                    }}
                    placeholder="Maya Okafor"
                    autoFocus
                    className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
                  />
                  {nameError && (
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-[#e0463c]">
                      <AlertCircle size={11} /> {nameError}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    handle
                  </Label>
                  <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-md border border-[#0E1909]/12 bg-white focus-within:ring-2 focus-within:ring-[#DAFF01]">
                    <span className="flex h-full items-center border-r border-[#0E1909]/10 bg-[#f8f9f3] px-3 font-mono text-sm text-[#0E1909]/50">
                      @
                    </span>
                    <input
                      value={handle}
                      onChange={(e) =>
                        setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && step1Valid) next();
                      }}
                      placeholder="maya-okafor"
                      className="h-full flex-1 bg-transparent px-3 font-mono text-sm text-[#0E1909] outline-none placeholder:text-[#0E1909]/35"
                    />
                  </div>
                  {handleError ? (
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-[#e0463c]">
                      <AlertCircle size={11} /> {handleError}
                    </p>
                  ) : (
                    <p className="mt-1.5 font-mono text-[11px] text-[#0E1909]/40">
                      3-20 chars · alphanumeric or dash · lowercase · this is
                      how founders @ you
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 — title + bio + location */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    title / role
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Founder · building Preship"
                    autoFocus
                    className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
                  />
                  <p className="mt-1.5 font-mono text-[11px] text-[#0E1909]/40">
                    one line · what you do, in founder terms
                  </p>
                </div>
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    bio
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="One paragraph on what you're building and where you are in the alpha journey."
                    className="mt-1.5 min-h-[100px] resize-none border-[#0E1909]/12 bg-white font-display text-sm leading-relaxed focus-visible:ring-[#DAFF01]"
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    location
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lagos, NG"
                    className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
                  />
                </div>
              </div>
            )}

            {/* Step 3 — skills */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="font-display text-[14px] leading-relaxed text-[#0E1909]/70">
                  List the things you can actually help another founder with.
                  These power your <span className="font-semibold">synergy match</span> —
                  broadcasts whose tags overlap with your skills surface first.
                </p>
                <div className="rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] p-4">
                  <SkillsEditor skills={skills} onChange={setSkills} />
                </div>
                <p className="font-mono text-[11px] text-[#0E1909]/40">
                  e.g. GTM, Rust, design, security, distribution · add as many
                  as you want
                </p>
              </div>
            )}

            {/* Step 4 — avatar */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="font-display text-[14px] leading-relaxed text-[#0E1909]/70">
                  Put a face to the handle. Auto-compressed to 400×400. You
                  can skip this and add one later from your profile.
                </p>
                <div className="rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] p-4">
                  <AvatarUpload
                    founder={{ avatarUrl: avatarUrl, name, handle: handleNorm }}
                    onUploaded={(url) => setAvatarUrl(url || null)}
                    size={96}
                  />
                </div>
                <p className="font-mono text-[11px] text-[#0E1909]/40">
                  reviewing: name, handle, title, bio, location, skills, avatar →
                  ready to complete onboarding
                </p>
              </div>
            )}

            {/* Footer nav */}
            <div className="mt-auto flex items-center justify-between gap-3 pt-6">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={back}
                    disabled={submitting}
                    className="tactile-flat h-10 border-[#0E1909]/20 bg-white px-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#f8f9f3] disabled:opacity-50"
                  >
                    <ArrowLeft size={13} /> back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {step < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    onClick={next}
                    disabled={!canContinue || submitting}
                    className="cta-lime h-10 bg-[#DAFF01] px-5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
                  >
                    continue →
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={finish}
                    disabled={submitting}
                    className="cta-lime h-10 bg-[#DAFF01] px-5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    complete onboarding →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/35">
          the alpha war room — collaborate in broad daylight
        </p>
      </div>
    </div>
  );
}
