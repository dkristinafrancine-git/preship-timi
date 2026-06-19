"use client";

/**
 * Client-side image compression using Canvas.
 * Resizes to fit within `maxDim`x`maxDim` (maintaining aspect), then encodes
 * as JPEG at the given quality. Returns a File ready to upload.
 *
 * This keeps uploads small (typically 30-80KB for a 400x400 avatar) and
 * offloads the work from the server.
 */
export async function compressImage(
  file: File,
  maxDim = 400,
  quality = 0.85,
  outputType: "image/jpeg" | "image/webp" = "image/jpeg"
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }

  // Load the image into an HTMLImageElement
  const img = await loadImage(file);

  // Compute target dimensions — fit within maxDim, preserve aspect ratio
  let { width, height } = img;
  if (width > height) {
    if (width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    }
  } else {
    if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  // Draw onto a canvas at the target size
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // white background for JPEG (avoids black on transparent PNGs)
  if (outputType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  // Encode to blob
  const ext = outputType === "image/webp" ? "webp" : "jpg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality)
  );
  if (!blob) throw new Error("Compression failed — could not encode image");

  // Rename to a sane filename
  const originalName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${originalName || "upload"}.${ext}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

/** Uploads a (already-compressed) file to /api/upload and returns the URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `Upload failed (HTTP ${res.status})`);
  }
  return (json as { url: string }).url;
}

/** One-shot helper: compress + upload, returning the public URL. */
export async function compressAndUpload(
  file: File,
  maxDim = 400,
  quality = 0.85
): Promise<string> {
  const compressed = await compressImage(file, maxDim, quality);
  return uploadImage(compressed);
}
