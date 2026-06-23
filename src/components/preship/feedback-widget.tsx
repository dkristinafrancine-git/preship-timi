"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePreship } from "@/lib/preship-store";
import { cn } from "@/lib/utils";
import { MessageSquare, LifeBuoy, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Tab = "feedback" | "support";

const FEEDBACK_CATEGORIES = ["Bug", "Feature request", "General"];

/**
 * Floating bottom-right Feedback / Support button.
 *
 * Renders nothing when there's no logged-in founder (`me` is null), so it only
 * appears on the authenticated /app surface — never on the public landing page
 * (where the CTA ribbon occupies the bottom edge instead).
 *
 * Opens a dialog with two tabs: Feedback (no star rating — just a category +
 * message) and Support (subject + message). Both post to /api/feedback with a
 * distinguishing `kind`.
 */
export function FeedbackWidget() {
  const me = usePreship((s) => s.me);
  const [open, setOpen] = useState(false);

  // Self-hide for anonymous visitors.
  if (!me) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cta-lime fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[#DAFF01] px-5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] shadow-[0_8px_24px_rgba(14,25,9,0.18)] transition hover:bg-[#c4e600] hover:shadow-[0_10px_30px_rgba(218,255,1,0.5)]"
        aria-label="Send feedback or get support"
      >
        <MessageSquare size={16} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("feedback");
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(FEEDBACK_CATEGORIES[0]);
    setSubject("");
    setMessage("");
  };

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: tab,
        category: tab === "feedback" ? category : null,
        subject: subject.trim() || null,
        message: message.trim(),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error((json as { error?: string }).error ?? "Submission failed");
      return;
    }
    toast.success(tab === "support" ? "Support request sent →" : "Thanks for the feedback →");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            {tab === "support" ? (
              <LifeBuoy size={16} className="text-[#DAFF01]" />
            ) : (
              <MessageSquare size={16} className="text-[#DAFF01]" />
            )}
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              {tab === "support" ? "Support" : "Feedback"}
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            {tab === "support" ? "we'll get back to you" : "help us shape preship"}
          </DialogDescription>
        </DialogHeader>

        {/* tabs */}
        <div className="flex gap-1 border-b border-[#0E1909]/8 bg-[#f8f9f3] px-5 py-2">
          {(["feedback", "support"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest transition tactile-flat",
                tab === t ? "bg-[#0E1909] text-[#DAFF01]" : "text-[#0E1909]/50 hover:text-[#0E1909]"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {tab === "feedback" ? (
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                category
              </Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FEEDBACK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest transition tactile-flat",
                      category === c
                        ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
                        : "border-[#0E1909]/15 bg-white text-[#0E1909]/60 hover:border-[#0E1909]"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                subject
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>
          )}

          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              message
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                tab === "support"
                  ? "Describe the issue or question…"
                  : "What's on your mind?"
              }
              className="mt-1.5 min-h-[110px] resize-none border-[#0E1909]/12 bg-white font-display text-sm leading-relaxed focus-visible:ring-[#DAFF01]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            sent from your account
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
              disabled={submitting || !message.trim()}
              className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              send →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
