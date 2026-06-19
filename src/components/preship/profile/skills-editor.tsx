"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";

/**
 * Tag-style skill editor. Skills are stored as comma-separated strings
 * in the DB but edited as an array here.
 */
export function SkillsEditor({
  skills,
  onChange,
  className,
}: {
  skills: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim().replace(/,$/, "").trim();
    if (!v) return;
    if (skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, v]);
    setDraft("");
  };

  const remove = (s: string) => onChange(skills.filter((x) => x !== s));

  return (
    <div className={cn("", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((s) => (
          <span
            key={s}
            className="group inline-flex items-center gap-1.5 rounded-md border border-[#0E1909] bg-[#0E1909] px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#DAFF01]"
          >
            {s}
            <button
              type="button"
              onClick={() => remove(s)}
              className="text-[#DAFF01]/50 transition hover:text-[#e0463c]"
              aria-label={`Remove ${s}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1.5 rounded-md border border-dashed border-[#0E1909]/25 bg-white px-2.5 py-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              } else if (e.key === "Backspace" && !draft && skills.length) {
                remove(skills[skills.length - 1]);
              }
            }}
            placeholder="add skill + enter"
            className="w-40 bg-transparent font-mono text-xs text-[#0E1909] outline-none placeholder:text-[#0E1909]/35"
          />
          {draft.trim() && (
            <button
              type="button"
              onClick={add}
              className="text-[#0E1909]/50 hover:text-[#0E1909]"
              aria-label="Add skill"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-[#0E1909]/40">
        used for matching synergy broadcasts · e.g. GTM, Rust, design, security
      </p>
    </div>
  );
}
