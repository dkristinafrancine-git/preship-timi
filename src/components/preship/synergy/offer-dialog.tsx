"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutate } from "@/lib/use-api";
import { Loader2, Handshake } from "lucide-react";

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

  const submit = async () => {
    if (!pitch.trim()) return;
    setSubmitting(true);
    const res = await mutate(`/api/synergy/${requestId}/offers`, {
      method: "POST",
      body: { pitch: pitch.trim(), offer: offer.trim() || null },
    });
    setSubmitting(false);
    if (res.ok) {
      setPitch("");
      setOffer("");
      onOpenChange(false);
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
          <DialogDescription className="font-mono text-[11px] uppercase tracking-widest text-white/50">
            {requestTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
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
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
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
            className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/60"
          >
            cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || !pitch.trim()}
            className="bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#c4e600] disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
            send handshake →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
