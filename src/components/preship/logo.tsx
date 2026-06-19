"use client";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "ink",
}: {
  className?: string;
  variant?: "ink" | "lime" | "on-dark";
}) {
  const text =
    variant === "lime"
      ? "text-[#DAFF01]"
      : variant === "on-dark"
      ? "text-white"
      : "text-[#0E1909]";
  const dot = "bg-[#DAFF01]";
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border font-mono text-sm font-bold",
          variant === "on-dark"
            ? "border-[#DAFF01]/40 bg-[#DAFF01] text-[#0E1909]"
            : "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
        )}
      >
        P_
      </span>
      <span className={cn("font-display text-xl font-semibold tracking-tight", text)}>
        Preship
      </span>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
    </div>
  );
}
