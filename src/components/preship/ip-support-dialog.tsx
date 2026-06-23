"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { Founder, Project } from "@/lib/preship-types";
import { Loader2, Scale, Check } from "lucide-react";
import { toast } from "sonner";

type Kind = "trademark" | "copyright" | "patent";

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "trademark", label: "Trademark", hint: "Brand names, logos, slogans" },
  { id: "copyright", label: "Copyright", hint: "Code, content, designs" },
  { id: "patent", label: "Patent", hint: "Inventions, processes" },
];

const STAGES = ["Just an idea", "Building it", "Launched", "Already using it publicly"];

/**
 * Trademark / Copyright / Patent intake form.
 *
 * Public-capable: when there's no session the submitter must supply an email
 * (used as reply-to). When logged in, identity is attached server-side and the
 * first project name is offered as a prefilled "project" field. Submits to the
 * public /api/ip-support endpoint.
 */
export function IpSupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>(
    isLoggedIn ? "/api/me" : null
  );

  const [kind, setKind] = useState<Kind>("trademark");
  const [protecting, setProtecting] = useState("");
  const [projectName, setProjectName] = useState("");
  const [stage, setStage] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setProtecting("");
    setProjectName("");
    setStage("");
    setJurisdiction("");
    setBudget("");
    setDetails("");
    setEmail("");
  };

  const submit = async () => {
    if (!protecting.trim() || !stage || !jurisdiction.trim()) return;
    if (!isLoggedIn && !email.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/ip-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        protecting: protecting.trim(),
        projectName: projectName.trim() || null,
        stage,
        jurisdiction: jurisdiction.trim(),
        budget: budget || null,
        details: details.trim() || null,
        email: isLoggedIn ? null : email.trim(),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error((json as { error?: string }).error ?? "Submission failed");
      return;
    }
    toast.success("Request sent — we'll be in touch →");
    reset();
    onOpenChange(false);
  };

  // first project as a convenience prefill suggestion
  const firstProject = meData?.projects?.[0]?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Intellectual property support
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            trademark · copyright · patent
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 scroll-thin">
          {/* protection type */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              what do you need?
            </Label>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left transition tactile-flat",
                    kind === k.id
                      ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                      : "border-[#0E1909]/15 bg-white text-[#0E1909] hover:border-[#0E1909]"
                  )}
                >
                  <span className="font-display text-sm font-semibold">{k.label}</span>
                  <span className={cn("font-mono text-[11px] leading-tight", kind === k.id ? "text-[#DAFF01]/60" : "text-[#0E1909]/45")}>
                    {k.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* what to protect */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              what are you protecting? *
            </Label>
            <Input
              value={protecting}
              onChange={(e) => setProtecting(e.target.value)}
              placeholder="e.g. the brand name 'Preship', our SDK source, a routing algorithm"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* project / company */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              project / company {firstProject ? "(optional)" : ""}
            </Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={firstProject ?? "Acme"}
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* stage + jurisdiction */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                stage *
              </Label>
              <div className="relative mt-1.5">
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-[#0E1909]/12 bg-white px-2.5 font-mono text-xs text-[#0E1909] outline-none focus-visible:border-[#0E1909]"
                >
                  <option value="">select…</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                country / jurisdiction *
              </Label>
              <Input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="US, EU, NG…"
                className="mt-1.5 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>
          </div>

          {/* budget */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              budget (optional)
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Exploring costs", "Under $1k", "$1k–5k", "$5k+"].map((bl) => (
                <button
                  key={bl}
                  onClick={() => setBudget(budget === bl ? "" : bl)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest transition tactile-flat",
                    budget === bl
                      ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
                      : "border-[#0E1909]/15 bg-white text-[#0E1909]/60 hover:border-[#0E1909]"
                  )}
                >
                  {bl}
                </button>
              ))}
            </div>
          </div>

          {/* details */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              details (optional)
            </Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything else — prior use, deadlines, existing filings…"
              className="mt-1.5 min-h-[70px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* email (anonymous only) */}
          {!isLoggedIn && (
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                your email *
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
              />
              <p className="mt-1.5 font-mono text-[11px] text-[#0E1909]/45">
                we'll reply to this address — create an account to track it in-app.
              </p>
            </div>
          )}

          {isLoggedIn && (
            <div className="flex items-start gap-2 rounded-md border border-[#6f8a3e]/40 bg-[#f4ffd6] px-3 py-2.5">
              <Check size={14} className="mt-0.5 shrink-0 text-[#0E1909]" />
              <p className="font-mono text-[11px] leading-relaxed text-[#0E1909]/70">
                Signed in — we'll attach your founder identity to this request.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            no obligation · we'll reply within 2 business days
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60"
            >
              cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={
                submitting ||
                !protecting.trim() ||
                !stage ||
                !jurisdiction.trim() ||
                (!isLoggedIn && !email.trim())
              }
              className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              request →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
