"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useApi, useMutate } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { ViewHeader } from "../view-header";
import { AvatarUpload } from "./avatar-upload";
import { SkillsEditor } from "./skills-editor";
import { BountiesGathered } from "./bounties-gathered";
import { FollowedUsers } from "../followed-users";
import { TerminalHeader, Tag } from "../badges";
import { ProjectMark } from "../avatars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Founder, Project, SynergyOffer } from "@/lib/preship-types";
import { Loader2, Save, Trophy, Share2, Link2, Check } from "lucide-react";
import { toast } from "sonner";

export function ProfileView() {
  const me = usePreship((s) => s.me);
  const setMe = usePreship((s) => s.setMe);
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const { data: bountiesData } = useApi<{ bounties: SynergyOffer[]; isOwner: boolean }>(
    "/api/bounties?mine=1"
  );

  // local editable copy of profile
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [bountiesPublic, setBountiesPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // track the user id we've initialized from, so we resync when the snapshot changes
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const mutate = useMutate();

  // initialize from fetched data (and resync when the snapshot changes after mutations)
  // Draft-editor pattern: sync server snapshot into local editable state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (meData?.user && meData.user.id !== syncedId) {
      const u = meData.user;
      setName(u.name);
      setTitle(u.title);
      setBio(u.bio ?? "");
      setLocation(u.location ?? "");
      setSkills(u.skills ? u.skills.split(",").map((s) => s.trim()).filter(Boolean) : []);
      setBountiesPublic(u.bountiesPublic ?? true);
      setAvatarUrl(u.avatarUrl ?? null);
      setSyncedId(u.id);
    }
  }, [meData, syncedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // dirty is derived: compare local fields to the server snapshot
  const dirty = (() => {
    const u = meData?.user;
    if (!u) return false;
    return (
      name !== u.name ||
      title !== u.title ||
      bio !== (u.bio ?? "") ||
      location !== (u.location ?? "") ||
      skills.join(",") !== (u.skills ?? "") ||
      bountiesPublic !== (u.bountiesPublic ?? true) ||
      avatarUrl !== (u.avatarUrl ?? null)
    );
  })();

  const save = async () => {
    setSaving(true);
    const res = await mutate("/api/me", {
      method: "PATCH",
      body: {
        name,
        title,
        bio: bio || null,
        location: location || null,
        skills,
        bountiesPublic,
        avatarUrl: avatarUrl || null,
      },
    });
    setSaving(false);
    if (res.ok) {
      const updated = (res.data as { user: Founder } | undefined)?.user;
      if (updated) setMe(updated);
      toast.success("Profile saved →");
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/?founder=${meData?.user?.id ?? ""}`;
    navigator.clipboard?.writeText(url);
    toast.success("Shareable link copied →");
  };

  const user = meData?.user;
  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-[#0E1909]/40">
        <Loader2 size={18} className="animate-spin" />
        <span className="ml-2 font-mono text-xs uppercase tracking-widest">loading profile…</span>
      </div>
    );
  }

  const bounties = bountiesData?.bounties ?? [];
  const projects = meData?.projects ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ViewHeader
        title="Profile"
        code="/profile"
        sub="your founder identity · skills · gathered bounties"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyShareLink}
              className="tactile-flat border-[#0E1909]/20 bg-white font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#f4ffd6]"
            >
              <Link2 size={13} /> copy link
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !dirty}
              className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              save
            </Button>
          </div>
        }
      />

      {/* identity + shareable (merged) */}
      <div className="terminal-card">
        <TerminalHeader
          label="identity"
          right={
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-widest",
                bountiesPublic ? "bg-[#DAFF01] text-[#0E1909]" : "bg-[#0E1909]/8 text-[#0E1909]/45"
              )}
            >
              {bountiesPublic ? "public" : "private"}
            </span>
          }
        />
        <div className="space-y-5 p-5">
          <AvatarUpload
            founder={{ ...user, avatarUrl }}
            onUploaded={(url) => setAvatarUrl(url || null)}
            size={96}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-9 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                title / role
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 h-9 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>
          </div>

          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              bio
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One paragraph on what you're building and where you are in the alpha journey."
              className="mt-1.5 min-h-[80px] resize-none border-[#0E1909]/12 bg-white font-display text-sm leading-relaxed focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                location
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lagos, NG"
                className="mt-1.5 h-9 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                handle
              </Label>
              <div className="mt-1.5 flex h-9 items-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] px-3 font-mono text-sm text-[#0E1909]/70">
                @{user.handle}
              </div>
            </div>
          </div>
        </div>

        {/* shareable footer — folded in from the old public-preview card */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0E1909]/8 bg-[#f8f9f3] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Share2 size={14} className="text-[#0E1909]/50" />
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70">
                shareable profile
              </p>
              <p className="font-mono text-[11px] text-[#0E1909]/45">
                {bountiesPublic
                  ? `${bounties.length} bounties visible on your public link`
                  : "bounties hidden from public view"}
              </p>
            </div>
          </div>
          <ShareableToggle
            checked={bountiesPublic}
            onChange={setBountiesPublic}
            onCopy={copyShareLink}
          />
        </div>
      </div>

      {/* skills card */}
      <div className="terminal-card">
        <TerminalHeader label="skillsets · synergy-matching" />
        <div className="p-5">
          <SkillsEditor skills={skills} onChange={setSkills} />
        </div>
      </div>

      {/* bounties gathered */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[#0E1909]/60" />
            <h3 className="font-display text-sm font-semibold text-[#0E1909]">
              Bounties gathered
            </h3>
            <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
              · {bounties.length} accepted handshake{bounties.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <BountiesGathered bounties={bounties} />
      </div>

      {/* my projects */}
      {projects.length > 0 && (
        <div className="terminal-card">
          <TerminalHeader label="my-projects" />
          <div className="space-y-1.5 p-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="hover-row -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1.5"
              >
                <ProjectMark mark={p.logoMark} color={p.logoColor} logoUrl={p.logoUrl} name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-semibold text-[#0E1909]">
                    {p.name}
                  </p>
                  <p className="truncate font-mono text-xs text-[#0E1909]/50">{p.tagline}</p>
                </div>
                <Tag>{p.alphaStage.split(" ")[0]}</Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* followed founders */}
      <FollowedUsers />
    </div>
  );
}

function ShareableToggle({
  checked,
  onChange,
  onCopy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#0E1909]/15 bg-white px-2.5 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[#0E1909]"
        />
        <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/65">
          shareable
        </span>
      </label>
      {checked && (
        <button
          onClick={() => {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="tactile-flat flex items-center gap-1 rounded-md border border-[#0E1909]/15 bg-white px-2 py-1.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/60 hover:text-[#0E1909]"
        >
          {copied ? <Check size={12} className="text-[#6f8a3e]" /> : <Link2 size={12} />}
          {copied ? "copied" : "link"}
        </button>
      )}
    </div>
  );
}
