import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const HANDLE_RE = /^[a-z0-9-]{3,20}$/;

/**
 * GET /api/onboarding
 *
 * Returns the current user's onboarding status.
 * Response: { onboarded: boolean }
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    return NextResponse.json({ onboarded: user.onboarded });
  } catch (err) {
    console.error("[GET /api/onboarding]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/onboarding
 *
 * Marks the current user as onboarded and saves their onboarding profile.
 * Body: { name, handle, title, bio, location, skills (array), avatarUrl }
 *
 * - handle is validated for format (3-20, alphanumeric+dash, lowercase) and
 *   uniqueness (if changed from the user's current handle).
 * - skills is stored as a comma-separated string.
 * - Sets `onboarded: true`.
 * - Returns the updated user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, handle, title, bio, location, skills, avatarUrl } =
      body as Record<string, unknown>;

    // --- name ---
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const nameTrim = name.trim();

    // --- handle ---
    if (typeof handle !== "string") {
      return NextResponse.json({ error: "handle is required" }, { status: 400 });
    }
    const handleNorm = handle.trim().toLowerCase();
    if (!HANDLE_RE.test(handleNorm)) {
      return NextResponse.json(
        {
          error:
            "handle must be 3-20 chars, alphanumeric or dash only, lowercase",
        },
        { status: 400 }
      );
    }
    // Uniqueness only matters if the handle is changing.
    if (handleNorm !== user.handle) {
      const clash = await db.user.findUnique({
        where: { handle: handleNorm },
        select: { id: true },
      });
      if (clash && clash.id !== user.id) {
        return NextResponse.json(
          { error: "This handle is already taken" },
          { status: 400 }
        );
      }
    }

    // --- title (optional, defaults to empty) ---
    const titleTrim =
      typeof title === "string" ? title.trim() : user.title ?? "";

    // --- bio (optional) ---
    const bioValue =
      typeof bio === "string" ? (bio.trim() || null) : user.bio;

    // --- location (optional) ---
    const locationValue =
      typeof location === "string" ? (location.trim() || null) : user.location;

    // --- skills (array → comma-separated) ---
    let skillsValue: string | null = user.skills;
    if (Array.isArray(skills)) {
      skillsValue = (skills as unknown[])
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");
    } else if (typeof skills === "string") {
      skillsValue = skills.trim() || null;
    }

    // --- avatarUrl (optional) ---
    const avatarValue =
      typeof avatarUrl === "string"
        ? avatarUrl || null
        : user.avatarUrl;

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: nameTrim,
        handle: handleNorm,
        title: titleTrim,
        bio: bioValue,
        location: locationValue,
        skills: skillsValue,
        avatarUrl: avatarValue,
        onboarded: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[POST /api/onboarding]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
