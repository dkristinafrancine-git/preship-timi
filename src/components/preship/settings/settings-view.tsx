"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useApi, useMutate } from "@/lib/use-api";
import { ViewHeader } from "../view-header";
import { ApiErrorState } from "../api-error-state";
import { TerminalHeader } from "../badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Monitor, Sun, Moon, Bell, Mail, Layout } from "lucide-react";
import { toast } from "sonner";

/**
 * Settings view — preferences only (not the profile).
 *
 * - prefTheme: system | light | dark (3-button picker)
 * - prefNotifications: in-app notification toasts
 * - prefEmailDigest: weekly email digest
 * - prefCompactMode: denser list / card spacing
 *
 * Loads from /api/preferences, PATCHes on save (only enabled when dirty).
 * Note: actually applying the theme/compact-mode is out of scope here —
 * we just persist the preference.
 */
type Preferences = {
  prefTheme: "system" | "light" | "dark";
  prefNotifications: boolean;
  prefEmailDigest: boolean;
  prefCompactMode: boolean;
};

const THEME_OPTIONS: {
  id: Preferences["prefTheme"];
  label: string;
  icon: typeof Monitor;
}[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

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
    return (
      prefs.prefTheme !== data.prefTheme ||
      prefs.prefNotifications !== data.prefNotifications ||
      prefs.prefEmailDigest !== data.prefEmailDigest ||
      prefs.prefCompactMode !== data.prefCompactMode
    );
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
        prefTheme: prefs.prefTheme,
        prefNotifications: prefs.prefNotifications,
        prefEmailDigest: prefs.prefEmailDigest,
        prefCompactMode: prefs.prefCompactMode,
      },
    });
    setSaving(false);
    if (res.ok && res.data) {
      // res.data is the patched prefs object returned by the API
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

      {/* Theme picker */}
      <div className="terminal-card">
        <TerminalHeader
          label="appearance · theme"
          right={
            <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
              {prefs.prefTheme}
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              theme
            </Label>
            <p className="mt-1 font-display text-[13px] leading-relaxed text-[#0E1909]/60">
              Choose how Preship looks. System follows your OS preference.
              Theme application is wired separately — this saves the choice.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = prefs.prefTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setPrefs((p) => (p ? { ...p, prefTheme: opt.id } : p))
                  }
                  aria-pressed={active}
                  className={cn(
                    "tactile-flat flex flex-col items-center gap-2 rounded-md border px-3 py-4 transition",
                    active
                      ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909] shadow-[0_2px_8px_rgba(14,25,9,0.10)]"
                      : "border-[#0E1909]/15 bg-white text-[#0E1909]/65 hover:border-[#0E1909]/35 hover:bg-[#f8f9f3]"
                  )}
                >
                  <Icon size={18} />
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications toggle */}
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

      {/* Email digest toggle */}
      <div className="terminal-card">
        <TerminalHeader label="email digest" />
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3]">
              <Mail size={16} className="text-[#0E1909]/70" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[#0E1909]">
                Weekly email digest
              </p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-[#0E1909]/55">
                One Monday-morning email with the broadcasts, offers, and
                sessions relevant to your skills.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.prefEmailDigest}
            onCheckedChange={(v) =>
              setPrefs((p) => (p ? { ...p, prefEmailDigest: v } : p))
            }
            aria-label="Toggle weekly email digest"
            className="data-[state=checked]:bg-[#0E1909] data-[state=unchecked]:bg-[#0E1909]/15"
          />
        </div>
      </div>

      {/* Compact mode toggle */}
      <div className="terminal-card">
        <TerminalHeader label="density · compact mode" />
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3]">
              <Layout size={16} className="text-[#0E1909]/70" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[#0E1909]">
                Compact mode
              </p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-[#0E1909]/55">
                Tighter card padding and row spacing so more of the war room
                fits on one screen.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.prefCompactMode}
            onCheckedChange={(v) =>
              setPrefs((p) => (p ? { ...p, prefCompactMode: v } : p))
            }
            aria-label="Toggle compact mode"
            className="data-[state=checked]:bg-[#0E1909] data-[state=unchecked]:bg-[#0E1909]/15"
          />
        </div>
      </div>

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
