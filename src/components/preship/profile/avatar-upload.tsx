"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { compressAndUpload } from "@/lib/image-compress";
import { FounderAvatar } from "../avatars";
import { FoundingBadge } from "../badges";
import type { Founder } from "@/lib/preship-types";
import { Loader2, Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Avatar upload with client-side compression (max 400x400, JPEG 0.85).
 * Shows the current avatar with an upload affordance; on file select,
 * compresses locally, uploads to /api/upload, and calls onChange(url).
 */
export function AvatarUpload({
  founder,
  onUploaded,
  size = 96,
  className,
}: {
  founder: Pick<Founder, "avatarUrl" | "name" | "handle" | "isFoundingMember">;
  onUploaded: (url: string) => void;
  size?: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "done">("idle");
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8MB before compression).");
      return;
    }
    try {
      setStatus("compressing");
      // Show a local preview immediately from the original file
      setPreview(URL.createObjectURL(file));

      setStatus("uploading");
      const url = await compressAndUpload(file, 400, 0.85);
      setPreview(null);
      setStatus("done");
      onUploaded(url);
      toast.success("Image compressed + uploaded →");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      setPreview(null);
      setStatus("idle");
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const busy = status === "compressing" || status === "uploading";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="group relative shrink-0" style={{ width: size, height: size }}>
        <FounderAvatar
          founder={{ ...founder, avatarUrl: preview ?? founder.avatarUrl }}
          size={size}
          className="size-full"
        />
        {/* overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-[#0E1909]/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 disabled:cursor-not-allowed"
          aria-label="Upload avatar"
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin text-[#DAFF01]" />
          ) : (
            <>
              <Camera size={20} className="text-[#DAFF01]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#DAFF01]">
                change
              </span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 font-display text-sm font-semibold text-[#0E1909]">
          <span>{founder.name}</span>
          <FoundingBadge show={founder.isFoundingMember} />
        </p>
        <p className="font-mono text-xs text-[#0E1909]/55">@{founder.handle}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="tactile-flat inline-flex items-center gap-1.5 rounded-md border border-[#0E1909]/15 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:border-[#0E1909] disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {status === "compressing"
              ? "compressing…"
              : status === "uploading"
              ? "uploading…"
              : "upload 400×400"}
          </button>
          {founder.avatarUrl && !busy && (
            <button
              type="button"
              onClick={() => {
                onUploaded("");
                toast.success("Avatar removed");
              }}
              className="tactile-flat inline-flex items-center gap-1 rounded-md border border-[#0E1909]/15 bg-white px-2 py-1.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/55 hover:text-[#e0463c]"
            >
              <X size={12} /> remove
            </button>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-[#0E1909]/40">
          auto-compressed to 400×400 · JPEG 0.85
        </p>
      </div>
    </div>
  );
}
