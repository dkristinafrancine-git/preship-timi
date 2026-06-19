"use client";

import { cn } from "@/lib/utils";
import type { Founder } from "@/lib/preship-types";

const FALLBACK_COLORS = ["#0E1909", "#6f8a3e", "#2a3a1f"];

export function FounderAvatar({
  founder,
  size = 40,
  className,
}: {
  founder: Pick<Founder, "avatarUrl" | "name" | "handle">;
  size?: number;
  className?: string;
}) {
  const initials = founder.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colorIdx =
    founder.name.charCodeAt(0) % FALLBACK_COLORS.length;
  const bg = FALLBACK_COLORS[colorIdx];

  if (founder.avatarUrl) {
    return (
      <img
        src={founder.avatarUrl}
        alt={founder.name}
        width={size}
        height={size}
        className={cn("rounded-md object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md font-mono font-bold text-[#DAFF01]",
        className
      )}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function ProjectMark({
  mark,
  color,
  logoUrl,
  name,
  size = 36,
  className,
}: {
  mark?: string | null;
  color: string;
  logoUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  // Prefer an uploaded logo image; fall back to a monogram-on-color tile.
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Project logo"}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-md border border-[#0E1909]/10 object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const isDark = color.toLowerCase() === "#0e1909";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border font-mono font-bold",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: color,
        color: isDark ? "#DAFF01" : "#0E1909",
        borderColor: isDark ? "#2a3a1f" : "rgba(14,25,9,0.12)",
      }}
    >
      {mark ?? "··"}
    </div>
  );
}
