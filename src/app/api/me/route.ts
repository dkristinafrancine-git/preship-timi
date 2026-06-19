import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user found" }, { status: 404 });
    }

    const projects = await db.project.findMany({
      where: { founderId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ user, projects });
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/me — update the current founder's profile.
 * Body may include any subset of: name, title, bio, location, avatarUrl, skills, bountiesPublic.
 * Skills is sent as an array of strings and stored comma-separated.
 */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const b = body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
    if (typeof b.title === "string") data.title = b.title.trim();
    if (typeof b.bio === "string") data.bio = b.bio.trim() || null;
    if (typeof b.location === "string") data.location = b.location.trim() || null;
    if (typeof b.avatarUrl === "string") data.avatarUrl = b.avatarUrl || null;
    if (Array.isArray(b.skills)) {
      data.skills = (b.skills as unknown[])
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");
    } else if (typeof b.skills === "string") {
      data.skills = (b.skills as string).trim() || null;
    }
    if (typeof b.bountiesPublic === "boolean") data.bountiesPublic = b.bountiesPublic;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[PATCH /api/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
