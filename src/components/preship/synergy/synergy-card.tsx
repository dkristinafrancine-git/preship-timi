"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SynergyRequest, SynergyOffer } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { FounderAvatar, ProjectMark } from "../avatars";
import { BountyBadge, StatusPill, Tag, StageChip } from "../badges";
import { FounderHoverCard } from "../founder-hover-card";
import { OfferDialog } from "./offer-dialog";
import { useApi } from "@/lib/use-api";
import { useMutate } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { ChevronDown, Handshake, MessageSquare, Loader2, Check, X, ArrowRight, Sparkles, Trash2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SynergyCard({
  request,
  isOwner,
  matchedSkills = [],
}: {
  request: SynergyRequest;
  isOwner: boolean;
  matchedSkills?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const mutate = useMutate();
  const me = usePreship((s) => s.me);

  const { data, loading } = useApi<{ offers: SynergyOffer[] }>(
    expanded ? `/api/synergy/${request.id}/offers` : null
  );
  const offers = data?.offers ?? [];
  const tags = request.tags ? request.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const accept = async (offerId: string) => {
    const res = await mutate(`/api/synergy/${request.id}/offers/${offerId}`, {
      method: "PATCH",
      body: { status: "accepted" },
    });
    if (res.ok) toast.success("Handshake accepted → request matched");
  };
  const decline = async (offerId: string) => {
    await mutate(`/api/synergy/${request.id}/offers/${offerId}`, {
      method: "PATCH",
      body: { status: "declined" },
    });
  };

  return (
    <div className="terminal-card hover:border-[#0E1909]/20">
      {/* header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1909]/8 bg-[#f8f9f3] px-4 py-2">
        <div className="flex items-center gap-2">
          <StatusPill status={request.status} />
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            broadcast · {fmtRelative(request.createdAt)} ago
          </span>
        </div>
        <BountyBadge type={request.bountyType} stake={request.stake} />
      </div>

      {/* body */}
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <FounderAvatar founder={request.founder} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <FounderHoverCard founder={request.founder} className="font-display text-[15px] font-semibold text-[#0E1909]">
                {request.founder.name}
              </FounderHoverCard>
              <span className="font-mono text-[13px] text-[#0E1909]/50">@{request.founder.handle}</span>
            </div>
            <p className="truncate font-mono text-xs text-[#0E1909]/55">{request.founder.title}</p>
          </div>
          {request.project && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-2 py-1">
              <ProjectMark mark={request.project.logoMark} color={request.project.logoColor} logoUrl={request.project.logoUrl} name={request.project.name} size={18} />
              <span className="font-display text-xs font-semibold text-[#0E1909]">
                {request.project.name}
              </span>
              <StageChip stage={request.project.alphaStage} className="ml-1 !px-1 !py-0 hidden sm:inline-flex" />
            </div>
          )}
        </div>

        <h3 className="mt-3.5 font-display text-lg font-semibold leading-snug text-[#0E1909]">
          {request.title}
        </h3>

        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] p-3.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              ⟶ bottleneck
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#0E1909]/80">{request.bottleneck}</p>
          </div>
          <div className="rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] p-3.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              ⟶ need
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#0E1909]/80">{request.need}</p>
          </div>
        </div>

        {request.bountyDetail && (
          <div className="mt-3 rounded-md border border-[#0E1909]/10 bg-[#0E1909] p-3.5 text-[#DAFF01]">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01]/60">
              ⟶ bounty terms
            </p>
            <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[#DAFF01]/90">
              {request.bountyDetail}
            </p>
          </div>
        )}

        {matchedSkills.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-[#DAFF01] bg-[#DAFF01]/15 px-3 py-2">
            <Sparkles size={13} className="shrink-0 text-[#0E1909]" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]">
              matches your skills:
            </span>
            <div className="flex flex-wrap gap-1">
              {matchedSkills.map((s) => (
                <span key={s} className="rounded bg-[#0E1909] px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#DAFF01]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const isMatch = matchedSkills.some((m) => m.toLowerCase() === t.toLowerCase());
              return (
                <Tag key={t} active={isMatch}>
                  #{t}
                </Tag>
              );
            })}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center gap-2 border-t border-[#0E1909]/8 px-3 py-2">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="tactile-flat flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/60 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
        >
          <MessageSquare size={13} />
          {request._count.offers} handshake{request._count.offers === 1 ? "" : "s"}
          <ChevronDown size={13} className={cn("transition-transform duration-200", expanded && "rotate-180")} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {request.myOffer && (
            <span className="rounded-md bg-[#f4ffd6] px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/70">
              you offered · {request.myOffer.status}
            </span>
          )}
          {!isOwner && request.status === "open" && !request.myOffer && (
            <Button
              size="sm"
              onClick={() => setOfferOpen(true)}
              className="cta-lime bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
            >
              <Handshake size={12} /> offer handshake →
            </Button>
          )}
          {isOwner && request.status === "open" && (
            <>
              <span className="rounded-md bg-[#0E1909] px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#DAFF01]">
                your broadcast
              </span>
              <button
                onClick={async () => {
                  await mutate(`/api/synergy/${request.id}`, {
                    method: "PATCH",
                    body: { status: "closed" },
                  });
                  toast.success("Broadcast closed →");
                }}
                className="tactile-flat rounded-md border border-[#0E1909]/15 bg-white px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:border-[#0E1909] hover:text-[#0E1909]"
                title="Close broadcast (stop accepting offers)"
              >
                <XCircle size={12} /> close
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this broadcast? This cannot be undone.")) return;
                  await mutate(`/api/synergy/${request.id}`, { method: "DELETE" });
                }}
                className="tactile-flat rounded-md border border-[#0E1909]/15 bg-white px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:border-[#e0463c] hover:text-[#e0463c]"
                title="Delete broadcast"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          {isOwner && request.status === "closed" && (
            <>
              <button
                onClick={async () => {
                  await mutate(`/api/synergy/${request.id}`, {
                    method: "PATCH",
                    body: { status: "open" },
                  });
                  toast.success("Broadcast reopened →");
                }}
                className="tactile-flat rounded-md border border-[#0E1909]/15 bg-white px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:border-[#0E1909] hover:text-[#0E1909]"
                title="Reopen broadcast"
              >
                <RotateCcw size={12} /> reopen
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this broadcast? This cannot be undone.")) return;
                  await mutate(`/api/synergy/${request.id}`, { method: "DELETE" });
                }}
                className="tactile-flat rounded-md border border-[#0E1909]/15 bg-white px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:border-[#e0463c] hover:text-[#e0463c]"
                title="Delete broadcast"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* expanded offers */}
      {expanded && (
        <div className="border-t border-[#0E1909]/8 bg-[#f8f9f3] p-3">
          {loading ? (
            <div className="flex items-center gap-2 py-3 font-mono text-xs text-[#0E1909]/40">
              <Loader2 size={12} className="animate-spin" /> loading handshakes…
            </div>
          ) : offers.length === 0 ? (
            <p className="py-3 text-center font-mono text-xs text-[#0E1909]/40">
              no handshakes yet · be the first to offer
            </p>
          ) : (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className={cn(
                    "rounded-md border bg-white p-2.5 transition-all duration-150 hover:shadow-[0_2px_6px_rgba(14,25,9,0.05)]",
                    o.status === "accepted"
                      ? "border-[#6f8a3e] bg-[#f4ffd6]"
                      : o.status === "declined"
                      ? "border-[#0E1909]/10 opacity-60"
                      : "border-[#0E1909]/12"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <FounderAvatar founder={o.founder} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-xs font-semibold text-[#0E1909]">
                          {o.founder.name}
                        </span>
                        <span className="font-mono text-xs text-[#0E1909]/45">
                          @{o.founder.handle} · {fmtRelative(o.createdAt)} ago
                        </span>
                        {o.status !== "pending" && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest",
                              o.status === "accepted"
                                ? "bg-[#6f8a3e] text-white"
                                : "bg-[#0E1909]/10 text-[#0E1909]/50"
                            )}
                          >
                            {o.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#0E1909]/80">{o.pitch}</p>
                      {o.offer && (
                        <p className="mt-1 rounded bg-[#f8f9f3] px-2 py-1 font-mono text-xs text-[#0E1909]/70">
                          counter: {o.offer}
                        </p>
                      )}
                    </div>
                  </div>
                  {isOwner && request.status === "open" && o.status === "pending" && (
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => decline(o.id)}
                        className="h-7 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:text-[#e0463c]"
                      >
                        <X size={11} /> decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => accept(o.id)}
                        className="cta-ink h-7 bg-[#0E1909] font-mono text-xs uppercase tracking-widest text-[#DAFF01] hover:bg-[#0E1909]/90"
                      >
                        <Check size={11} /> accept handshake
                      </Button>
                    </div>
                  )}
                  {!isOwner && me?.id === o.founderId && o.status === "pending" && (
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await mutate(`/api/synergy/${request.id}/offers/${o.id}`, { method: "DELETE" });
                        }}
                        className="h-7 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50 hover:text-[#e0463c]"
                      >
                        <Trash2 size={11} /> withdraw
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <OfferDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        requestId={request.id}
        requestTitle={request.title}
      />
    </div>
  );
}
