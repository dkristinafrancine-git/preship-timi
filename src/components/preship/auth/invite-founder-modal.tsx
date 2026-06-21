"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2, Check, Clock, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Invite = {
  id: string;
  email: string;
  status: "sent" | "accepted";
  note?: string | null;
  createdAt: string;
};

/**
 * Invite Founder modal — a real email form.
 *
 * Logged-in founders type an invitee email + optional note; we POST to
 * /api/invites, which creates an Invite row and sends the styled invite
 * email via Resend. Already-sent invites are listed underneath, with their
 * status (sent / accepted).
 *
 * Styling matches the rest of the app: ink header strip, lime CTA, mono
 * uppercase labels, terminal feel.
 */
export function InviteFounderModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Load the inviter's existing invites whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoadingInvites(true);
    fetch("/api/invites", { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { invites: Invite[] }) => {
        if (alive) setInvites(d.invites ?? []);
      })
      .catch(() => {
        // non-fatal — just don't render the list
      })
      .finally(() => {
        if (alive) setLoadingInvites(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const emailNorm = email.trim().toLowerCase();
  const emailError =
    emailNorm && !EMAIL_RE.test(emailNorm) ? "Enter a valid email address" : "";

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!emailNorm) {
      toast.error("Enter an email address");
      return;
    }
    if (emailError) {
      toast.error(emailError);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: emailNorm, note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error((json as { error?: string }).error ?? "Failed to send invite");
        setSending(false);
        return;
      }
      const result = json as { invite: Invite; delivered: boolean };
      // optimistic prepend
      setInvites((prev) => [
        result.invite,
        ...prev.filter((i) => i.email !== result.invite.email),
      ]);
      toast.success(
        result.delivered
          ? `Invite sent to ${result.invite.email}`
          : `Invite saved (email logged — set RESEND_API_KEY to deliver)`
      );
      setEmail("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        {/* ink header strip */}
        <DialogHeader className="gap-0 border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Invite a founder
            </DialogTitle>
          </div>
          <DialogDescription className="mt-1 font-mono text-xs uppercase tracking-widest text-white/50">
            send an invite link by email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          <p className="font-display text-sm leading-relaxed text-[#0E1909]/70">
            Founders you invite get a styled signup link. When they join,
            their invite is marked accepted.
          </p>

          <form onSubmit={onSend} className="space-y-4">
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                founder email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@startup.app"
                autoComplete="email"
                autoCapitalize="none"
                autoFocus
                className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
              />
              {emailError && (
                <p className="mt-1.5 font-mono text-xs text-[#e0463c]">{emailError}</p>
              )}
            </div>

            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                personal note <span className="text-[#0E1909]/35">(optional)</span>
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hey — we should team up in the war room. Come build with us."
                maxLength={500}
                className="mt-1.5 min-h-[80px] resize-none border-[#0E1909]/12 bg-white font-display text-sm leading-relaxed focus-visible:ring-[#DAFF01]"
              />
              <p className="mt-1.5 text-right font-mono text-[11px] text-[#0E1909]/35">
                {note.length}/500
              </p>
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="cta-lime h-10 w-full bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              send invite →
            </Button>
          </form>

          {/* Already-sent invites list */}
          {invites.length > 0 && (
            <div className="border-t border-[#0E1909]/8 pt-4">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/50">
                <Sparkles size={12} /> your invites
              </p>
              <ul className="space-y-1.5">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-[#0E1909]">
                        {inv.email}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
                        {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
                        inv.status === "accepted"
                          ? "bg-[#DAFF01] text-[#0E1909]"
                          : "bg-[#0E1909]/8 text-[#0E1909]/55"
                      )}
                    >
                      {inv.status === "accepted" ? (
                        <>
                          <UserCheck size={10} /> accepted
                        </>
                      ) : (
                        <>
                          <Clock size={10} /> sent
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadingInvites && invites.length === 0 && (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-[#0E1909]/35">
              loading invites…
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
