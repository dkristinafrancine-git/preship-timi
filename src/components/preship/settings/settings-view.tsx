"use client";

import { useEffect, useState } from "react";
import { useApi, useMutate } from "@/lib/use-api";
import { ViewHeader } from "../view-header";
import { ApiErrorState } from "../api-error-state";
import { TerminalHeader } from "../badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Bell, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { PasswordChange } from "./password-change";

/**
 * Settings view — preferences + security (not the profile).
 *
 * Toggles that are wired:
 *   - prefNotifications: in-app notification toasts / bell badge
 *
 * Locked ("coming soon"):
 *   - prefTheme (appearance)
 *   - prefEmailDigest (weekly email)
 *
 * And a security section with the password-change card.
 *
 * Loads from /api/preferences, PATCHes on save (only enabled when dirty).
 */
type Preferences = {
  prefNotifications: boolean;
};

export function SettingsView() {
  const { data, loading, error, refetch } = useApi<Preferences>("/api/preferences");
  const mutate = useMutate();

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync server snapshot into local editable state once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data && !synced) {
      setPrefs(data);
      setSynced(true);
    }
  }, [data, synced]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dirty = (() => {
    if (!data || !prefs) return false;
    return prefs.prefNotifications !== data.prefNotifications;
  })();

  const reset = () => {
    if (data) {
      setPrefs(data);
    }
  };

  const save = async () => {
    if (!prefs || !dirty) return;
    setSaving(true);
    const res = await mutate<Preferences>("/api/preferences", {
      method: "PATCH",
      body: {
        prefNotifications: prefs.prefNotifications,
      },
    });
    setSaving(false);
    if (res.ok && res.data) {
      setPrefs(res.data);
      toast.success("Preferences saved →");
    }
  };

  if (loading && !prefs) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-20 text-[#0E1909]/40">
        <Loader2 size={18} className="animate-spin" />
        <span className="ml-2 font-mono text-xs uppercase tracking-widest">
          loading preferences…
        </span>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <ApiErrorState
          onRetry={refetch}
          message={error ? `Couldn't load preferences (${error}).` : "Couldn't load preferences."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ViewHeader
        title="Settings"
        code="/settings"
        sub="preferences · not your profile"
        action={
          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                disabled={saving}
                className="h-9 font-mono text-xs uppercase tracking-widest text-[#0E1909]/55 hover:text-[#0E1909]"
              >
                reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !dirty}
              className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              save
            </Button>
          </div>
        }
      />

      {/* Notifications toggle (wired) */}
      <div className="terminal-card">
        <TerminalHeader label="notifications" />
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3]">
              <Bell size={16} className="text-[#0E1909]/70" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[#0E1909]">
                In-app notifications
              </p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-[#0E1909]/55">
                Show a bell badge + toast when someone reacts, comments,
                offers, or follows you.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.prefNotifications}
            onCheckedChange={(v) =>
              setPrefs((p) => (p ? { ...p, prefNotifications: v } : p))
            }
            aria-label="Toggle in-app notifications"
            className="data-[state=checked]:bg-[#0E1909] data-[state=unchecked]:bg-[#0E1909]/15"
          />
        </div>
      </div>

      {/* Theme — coming soon */}
      <ComingSoonCard
        label="appearance · theme"
        icon={<Sparkles size={16} className="text-[#0E1909]/70" />}
        title="Theme"
        description="Light, dark, and system modes are on the roadmap. For now Preship is designed as a single, deliberate light theme."
      />

      {/* Email digest — coming soon */}
      <ComingSoonCard
        label="email digest"
        icon={<Bell size={16} className="text-[#0E1909]/70" />}
        title="Weekly email digest"
        description="A Monday-morning summary of the broadcasts, offers, and sessions relevant to your skills. Email delivery lands with this."
      />

      {/* Security: password */}
      <PasswordChange />

      {/* Footer note */}
      <div className="rounded-md border border-dashed border-[#0E1909]/15 bg-[#f8f9f3] px-5 py-4">
        <p className="font-mono text-xs leading-relaxed text-[#0E1909]/50">
          profile edits (name, title, bio, skills, avatar) live on the{" "}
          <span className="font-semibold text-[#0E1909]/70">Profile</span> tab.
          these settings only control how the network behaves around you →
        </p>
      </div>
    </div>
  );
}

/** Locked "coming soon" card — surfaces the planned feature without wiring it. */
function ComingSoonCard({
  label,
  icon,
  title,
  description,
}: {
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="terminal-card opacity-95">
      <TerminalHeader
        label={label}
        right={
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/40">
            <Lock size={10} /> coming soon
          </span>
        }
      />
      <div className="flex items-start gap-3 p-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-[#0E1909]/70">
            {title}
          </p>
          <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-[#0E1909]/50">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
