"use client";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "ink",
}: {
  className?: string;
  variant?: "ink" | "lime" | "on-dark";
}) {
  // The provided SVG wordmark uses #0E1909 ink paths. For on-dark surfaces we
  // invert via CSS filter so the wordmark reads as #DAFF01 lime / white.
  const filter =
    variant === "lime" || variant === "on-dark"
      ? "invert(94%) sepia(83%) saturate(743%) hue-rotate(34deg) brightness(105%)"
      : "none";
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <img
        src="/logo_preship.svg"
        alt="Preship"
        className="h-7 w-auto"
        style={{ filter }}
        draggable={false}
      />
      <span className="h-1.5 w-1.5 rounded-full bg-[#DAFF01]" />
    </div>
  );
}
