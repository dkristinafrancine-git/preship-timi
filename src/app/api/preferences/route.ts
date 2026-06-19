import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const VALID_THEMES = ["system", "light", "dark"] as const;

/**
 * GET /api/preferences
 *
 * Returns the current user's preferences.
 * Response: { prefTheme, prefNotifications, prefEmailDigest, prefCompactMode }
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    return NextResponse.json({
      prefTheme: user.prefTheme,
      prefNotifications: user.prefNotifications,
      prefEmailDigest: user.prefEmailDigest,
      prefCompactMode: user.prefCompactMode,
    });
  } catch (err) {
    console.error("[GET /api/preferences]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/preferences
 *
 * Updates any subset of the current user's preferences.
 * Body may include: { prefTheme?, prefNotifications?, prefEmailDigest?, prefCompactMode? }
 *
 * - prefTheme must be one of: system | light | dark
 * - prefNotifications / prefEmailDigest / prefCompactMode must be booleans
 *
 * Returns the updated preferences object.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (b.prefTheme !== undefined) {
      if (
        typeof b.prefTheme !== "string" ||
        !(VALID_THEMES as readonly string[]).includes(b.prefTheme)
      ) {
        return NextResponse.json(
          { error: `prefTheme must be one of: ${VALID_THEMES.join(", ")}` },
          { status: 400 }
        );
      }
      data.prefTheme = b.prefTheme;
    }

    if (b.prefNotifications !== undefined) {
      if (typeof b.prefNotifications !== "boolean") {
        return NextResponse.json(
          { error: "prefNotifications must be a boolean" },
          { status: 400 }
        );
      }
      data.prefNotifications = b.prefNotifications;
    }

    if (b.prefEmailDigest !== undefined) {
      if (typeof b.prefEmailDigest !== "boolean") {
        return NextResponse.json(
          { error: "prefEmailDigest must be a boolean" },
          { status: 400 }
        );
      }
      data.prefEmailDigest = b.prefEmailDigest;
    }

    if (b.prefCompactMode !== undefined) {
      if (typeof b.prefCompactMode !== "boolean") {
        return NextResponse.json(
          { error: "prefCompactMode must be a boolean" },
          { status: 400 }
        );
      }
      data.prefCompactMode = b.prefCompactMode;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid preference fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        prefTheme: true,
        prefNotifications: true,
        prefEmailDigest: true,
        prefCompactMode: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/preferences]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
