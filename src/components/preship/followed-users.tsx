"use client";

import { useApi, useMutate } from "@/lib/use-api";
import { FounderAvatar } from "./avatars";
import { FounderHoverCard } from "./founder-hover-card";
import { TerminalHeader, Tag } from "./badges";
import type { Founder } from "@/lib/preship-types";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FollowFounder = Pick<
  Founder,
  "id" | "name" | "handle" | "title" | "bio" | "location" | "avatarUrl" | "skills"
>;

/**
 * Card showing the founders the current user follows.
 * Rendered on the Profile view.
 */
export function FollowedUsers() {
  const { data, loading } = useApi<{ founders: FollowFounder[]; count: number }>(
    "/api/me/follows"
  );
  const mutate = useMutate();
  const founders = data?.founders ?? [];

  const unfollow = async (id: string) => {
    const res = await mutate("/api/follows", { method: "POST", body: { founderId: id } });
    if (res.ok) toast.success("Unfollowed →");
  };

  return (
    <div className="terminal-card">
      <TerminalHeader
        label={`following · ${founders.length}`}
        right={<UserPlus size={14} className="text-[#0E1909]/40" />}
      />
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[#0E1909]/40">
            <Loader2 size={14} className="animate-spin" />
            <span className="font-mono text-xs uppercase tracking-widest">loading…</span>
          </div>
        ) : founders.length === 0 ? (
          <p className="py-4 text-center font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            not following anyone yet · hover a founder's name anywhere to follow
          </p>
        ) : (
          <ul className="space-y-1.5">
            {founders.map((f) => {
              const skills = f.skills
                ? f.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3)
                : [];
              return (
                <li
                  key={f.id}
                  className="hover-row -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-2"
                >
                  <FounderAvatar founder={f} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <FounderHoverCard
                        founder={f}
                        className="font-display text-[13px] font-semibold text-[#0E1909]"
                      >
                        {f.name}
                      </FounderHoverCard>
                      <span className="truncate font-mono text-xs text-[#0E1909]/50">
                        @{f.handle}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11px] text-[#0E1909]/55">{f.title}</p>
                    {skills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {skills.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => unfollow(f.id)}
                    className="tactile-flat shrink-0 rounded-md border border-[#0E1909]/15 bg-white px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/55 hover:border-[#e0463c] hover:text-[#e0463c]"
                  >
                    following
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
