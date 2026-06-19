import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * POST /api/upload
 * Accepts multipart/form-data with a `file` field (already client-compressed).
 * Saves to public/uploads/<uuid>.<ext>. Returns { url }.
 *
 * The client is expected to pre-compress images to max 400x400 before sending,
 * but we still sanity-check size (< 1.5MB) and content type.
 */
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB for audio

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file field" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, or GIF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024).toFixed(0)}KB). Max 1.5MB.` },
        { status: 400 }
      );
    }

    const ext = file.type.split("/")[1] || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buf);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
