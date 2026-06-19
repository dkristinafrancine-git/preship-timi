import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/current-user";

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with a `file` field (already client-compressed for
 * images). Uploads the file to the `media` bucket in Supabase Storage and
 * returns `{ url }` — a fully-qualified public Supabase URL that consumers
 * store in the DB (User.avatarUrl / Project.logoUrl / Post.audioUrl) and render
 * verbatim in <img>/<audio> tags.
 *
 * Security:
 * - Requires an authenticated founder (getCurrentUser). Anonymous uploads are
 *   rejected with 401. (Previously this route had no auth check.)
 * - The Supabase client uses the SERVICE ROLE key, which bypasses RLS. It is
 *   constructed here on the server only — NEVER expose this key to the client.
 * - MIME type is allow-listed and size is capped.
 */

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const BUCKET = "media";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    // --- Auth: only signed-in founders may upload ---
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file field" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, or GIF (images) or WebM/OGG/MP3/MP4 (audio).`,
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024).toFixed(0)}KB). Max ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // --- Upload to Supabase Storage ---
    const ext = file.type.split("/")[1] || "bin";
    // Prefix with the founder id so per-user objects are namespaced; the
    // randomUUID keeps collisions impossible.
    const objectPath = `${user.id}/${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const supabase = getSupabaseAdmin();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (upErr) {
      console.error("[POST /api/upload] storage error", upErr);
      return NextResponse.json(
        { error: "Upload failed — storage error" },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
