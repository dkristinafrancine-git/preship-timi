// Preship shared constants — kept in sync between frontend & backend.

export const ALPHA_STAGES = [
  "Customer Discovery",
  "Problem Validation",
  "Prototyping",
  "Closed Beta",
  "Public Beta",
  "Pre-Launch",
] as const;
export type AlphaStage = (typeof ALPHA_STAGES)[number];

// stage -> short code used in terminal-style chips
export const STAGE_CODE: Record<string, string> = {
  "Customer Discovery": "CD",
  "Problem Validation": "PV",
  Prototyping: "PT",
  "Closed Beta": "CB",
  "Public Beta": "PB",
  "Pre-Launch": "PL",
};

// ordered progression for the stage rail
export const STAGE_ORDER: Record<string, number> = ALPHA_STAGES.reduce(
  (acc, s, i) => ({ ...acc, [s]: i }),
  {} as Record<string, number>
);

export const BOUNTY_TYPES = [
  { id: "equity", label: "Equity stake", short: "EQ", needsStake: true },
  { id: "advisor-shares", label: "Advisor shares", short: "AD", needsStake: true },
  { id: "revenue-share", label: "Revenue share", short: "RS", needsStake: true },
  { id: "cofounder", label: "Co-founder offer", short: "CF", needsStake: true },
  { id: "barter", label: "Barter / skills swap", short: "BX", needsStake: false },
] as const;

export const IDEA_ROLES = [
  { id: "host", label: "Host" },
  { id: "co-host", label: "Co-host" },
  { id: "technical-lead", label: "Technical Lead" },
  { id: "design-lead", label: "Design Lead" },
  { id: "product-lead", label: "Product Lead" },
  { id: "marketing-lead", label: "Marketing Lead" },
  { id: "participant", label: "Participant" },
] as const;

/** Preset role IDs (host-defined custom roles are NOT in this set — they're
 *  free text stored in rolesOpen and validated per-session at signup). Typed
 *  as Set<string> so `.has()` accepts arbitrary role slugs without narrowing. */
export const PRESET_ROLE_IDS: Set<string> = new Set(IDEA_ROLES.map((r) => r.id));

export const POST_REACTIONS = ["like", "repost", "handshake"] as const;
export type ReactionKind = (typeof POST_REACTIONS)[number];

/**
 * Derive the effective status of an IdeaLab session at read time.
 *
 * The stored `status` column only changes when the host clicks "go live" or
 * "end session" — so if the host abandons a live room, closes the tab, or
 * never shows up to a scheduled one, the stored value goes stale forever
 * (this was the root cause of the "always Live" and "perpetually Upcoming"
 * bugs). Deriving the effective status on every read fixes both without any
 * cron job or background sweep.
 *
 * Rules (host's explicit action always wins where it makes sense):
 *  - `ended` stays `ended` — the host ended it deliberately; never reopen.
 *  - `live` whose window has passed → `ended` (host went live then vanished).
 *  - `live` whose window hasn't passed → `live` (host went live, possibly
 *    early — respect the explicit action).
 *  - `scheduled` whose start has arrived but hasn't ended → `live` (auto-go-
 *    -live so the room is joinable even if the host forgets to click).
 *  - `scheduled` whose whole window has passed → `ended` (no-show).
 *  - `scheduled` before its start → `scheduled`.
 */
export function deriveSessionStatus(
  storedStatus: string,
  scheduledAt: Date | string,
  durationMins: number
): "scheduled" | "live" | "ended" {
  if (storedStatus === "ended") return "ended";
  const start = new Date(scheduledAt).getTime();
  const end = start + Math.max(1, durationMins) * 60_000;
  const now = Date.now();
  // Window has closed → ended regardless of stored value (abandoned live room
  // or no-show scheduled room).
  if (now >= end) return "ended";
  // Host explicitly went live (maybe early) → keep live until window ends.
  if (storedStatus === "live") return "live";
  // Stored "scheduled": auto-promote to live once the start arrives, so a
  // no-action host still gets a joinable room for the duration window.
  if (now >= start) return "live";
  return "scheduled";
}

export const PROJECT_CATEGORIES = [
  "DevTool",
  "SaaS",
  "Consumer",
  "AI",
  "Marketplace",
  "Infra",
  "Fintech",
] as const;

export function fmtRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(days / 30);
  return `${mo}mo`;
}

export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
}
