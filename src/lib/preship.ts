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

export const POST_REACTIONS = ["like", "repost", "handshake"] as const;
export type ReactionKind = (typeof POST_REACTIONS)[number];

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
