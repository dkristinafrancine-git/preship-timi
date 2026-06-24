"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApi, useMutate, useSynergyCache } from "@/lib/use-api";
import type { Founder, SynergyOffer } from "@/lib/preship-types";
import { Loader2, Handshake } from "lucide-react";
import { toast } from "sonner";

export function OfferDialog({
  open,
  onOpenChange,
  requestId,
  requestTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  requestTitle: string;
}) {
  const [pitch, setPitch] = useState("");
  const [offer, setOffer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mutate = useMutate();
  const synergyCache = useSynergyCache(requestId);
  const { data: meData } = useApi<{ user: Founder }>("/api/me");

  const submit = async () => {
    if (!pitch.trim()) return;
    const me = meData?.user;
    if (!me) return;
    const pitchText = pitch.trim();
    const offerText = offer.trim() || null;

    // Optimistic: build a provisional offer with a temp id, prepend it to the
    // cached offer list AND bump the parent request's offer count + set myOffer.
    // Both patch instantly; the real offer swaps in (temp→real) once the POST
    // resolves. On failure we close the dialog (the count badge will re-sync on
    // the next natural refetch) and toast.
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provisional: SynergyOffer = {
      id: tempId,
      requestId,
      founderId: me.id,
      pitch: pitchText,
      offer: offerText,
      status: "pending",
      createdAt: new Date().toISOString(),
      founder: me,
    };
    synergyCache.prependOffer(provisional);
    synergyCache.offerSubmitted(provisional);

    setSubmitting(true);
    const res = await mutate<{ offer: SynergyOffer }>(`/api/synergy/${requestId}/offers`, {
      method: "POST",
      body: { pitch: pitchText, offer: offerText },
      invalidate: [], // already patched optimistically
    });
    setSubmitting(false);
    if (res.ok && res.data?.offer) {
      // Reconcile: swap the temp offer for the real one in both caches.
      synergyCache.removeOffer(tempId);
      synergyCache.prependOffer(res.data.offer);
      // myOffer was set to the provisional; re-point it at the real offer.
      synergyCache.offerSubmitted(res.data.offer);
      setPitch("");
      setOffer("");
      onOpenChange(false);
      toast.success("Handshake offered →");
    } else {
      // Roll back the optimistic offer + count bump.
      synergyCache.removeOffer(tempId);
      toast.error("Couldn't send handshake — please retry.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Handshake size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Offer a handshake
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            {requestTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              your pitch
            </Label>
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Why are you the right match for this bottleneck? Be specific."
              className="mt-1.5 min-h-[100px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              counter-offer (optional)
            </Label>
            <Textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. open to 35% if you want me full-time pre-seed."
              className="mt-1.5 min-h-[60px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
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
            disabled={submitting || !pitch.trim()}
            className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
            send handshake →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
