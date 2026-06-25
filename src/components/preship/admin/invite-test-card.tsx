"use client";

import { useState, FormEvent } from "react";
import { Mail, Send, Loader2, Check, X, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TestResult = {
  delivered: boolean;
  messageId?: string;
  /** Present when RESEND_API_KEY is unset (dev fallback). */
  previewHtml?: string;
  error?: string;
};

/**
 * Admin-only card that sends a real founder-invite email to an address of the
 * admin's choosing — a pure transport check for the Resend key + verified
 * MAIL_FROM domain. Does not create an Invite row. POSTs /api/admin/invites/test.
 *
 * Surfaces a delivered/failed state, the Resend message id when delivered, a
 * collapsible rendered-HTML preview (useful in dev when no key is set), and the
 * transport error message when the send fails (bad key, unverified domain…).
 */
export function InviteTestCard() {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const toNorm = to.trim().toLowerCase();
  const emailError =
    toNorm && !EMAIL_RE.test(toNorm) ? "Enter a valid email address" : "";

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!toNorm) {
      toast.error("Enter an email address");
      return;
    }
    if (emailError) {
      toast.error(emailError);
      return;
    }
    setSending(true);
    setResult(null);
    setShowPreview(false);
    try {
      const res = await fetch("/api/admin/invites/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ to: toNorm }),
      });
      const json = (await res.json()) as TestResult & { error?: string };
      if (!res.ok && !json.delivered && json.error) {
        setResult({ delivered: false, error: json.error, previewHtml: json.previewHtml });
        toast.error(json.error);
      } else {
        setResult(json);
        toast.success(
          json.delivered
            ? `Test invite delivered to ${toNorm}`
            : `Not delivered (set RESEND_API_KEY) — preview logged`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setResult({ delivered: false, error: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-white/90">
          Invite email · test send
        </h3>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/40">
          <Mail size={12} /> resend transport check
        </span>
      </div>

      <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/45">
        Sends the real styled invite email to an address you choose. No account
        is created. Confirms your <span className="text-white/70">RESEND_API_KEY</span> +{" "}
        <span className="text-white/70">MAIL_FROM</span> domain deliver before
        relying on the invite flow.
      </p>

      <form onSubmit={onSend} className="mt-4 space-y-3">
        <div>
          <Label className="font-mono text-[11px] font-semibold uppercase tracking-widest text-white/50">
            send test invite to
          </Label>
          <Input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            className="mt-1.5 h-9 border-white/12 bg-white/[0.04] font-mono text-sm text-white/90 placeholder:text-white/25 focus-visible:ring-[#DAFF01]"
          />
          {emailError && (
            <p className="mt-1.5 font-mono text-[11px] text-red-300/80">{emailError}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={sending}
          className="h-9 w-full bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          send test invite →
        </Button>
      </form>

      {result && (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3",
              result.delivered
                ? "border-[#DAFF01]/30 bg-[#DAFF01]/[0.06]"
                : "border-red-400/30 bg-red-400/[0.06]"
            )}
          >
            {result.delivered ? (
              <Check size={15} className="mt-0.5 shrink-0 text-[#DAFF01]" />
            ) : (
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-300/90" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-mono text-[11px] font-semibold uppercase tracking-widest",
                  result.delivered ? "text-[#DAFF01]" : "text-red-300/90"
                )}
              >
                {result.delivered ? "delivered" : "not delivered"}
              </p>
              {result.messageId && (
                <p className="mt-1 break-all font-mono text-[10px] text-white/45">
                  id: {result.messageId}
                </p>
              )}
              {result.error && (
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-red-200/85">
                  {result.error}
                </p>
              )}
              {!result.delivered && !result.error && (
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/45">
                  RESEND_API_KEY is unset — the email was logged server-side
                  instead of sent. Preview below.
                </p>
              )}
            </div>
          </div>

          {result.previewHtml && (
            <div className="rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-white/50 transition hover:text-white/80"
              >
                <span className="flex items-center gap-1.5">
                  <ChevronDown
                    size={12}
                    className={cn("transition", showPreview && "rotate-180")}
                  />
                  rendered html preview
                </span>
                <X size={12} className="opacity-0" aria-hidden />
              </button>
              {showPreview && (
                <iframe
                  title="invite email preview"
                  srcDoc={result.previewHtml}
                  className="h-[420px] w-full rounded-b-lg border-t border-white/10 bg-white"
                  sandbox=""
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
