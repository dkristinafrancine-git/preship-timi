import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// POST /api/idealab/[id]/signup — register the current user with a role.
//
// Role validation is per-session, not a fixed enum: the host may have defined
// custom roles (free text) when creating the session, so the allowed set is
// the session's own `rolesOpen` plus "participant" as a universal fallback.
// This is the key change that lets hosts recruit for arbitrary roles like
// "ML engineer" or "growth hacker" without code changes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const role = (body as { role?: string }).role;

    // Load the session to resolve its own allowed roles (presets + customs).
    // `participant` is always allowed as a fallback so the room is joinable
    // even if the host opened it with a niche custom-only role set.
    const session = await db.ideaLabSession.findUnique({
      where: { id },
      select: { id: true, maxSeats: true, rolesOpen: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionRoles = session.rolesOpen
      ? session.rolesOpen
          .split(",")
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const allowed = new Set<string>([...sessionRoles, "participant"]);
    if (!role || !allowed.has(String(role).toLowerCase())) {
      return NextResponse.json(
        {
          error: `role is required and must be one of: ${[...allowed].join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existing = await db.ideaLabSignup.findUnique({
      where: {
        sessionId_userId: { sessionId: id, userId: user.id },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true, isFoundingMember: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "already signed up", signup: existing },
        { status: 400 }
      );
    }

    const activeCount = await db.ideaLabSignup.count({
      where: {
        sessionId: id,
        status: { in: ["confirmed", "registered"] },
      },
    });
    if (activeCount >= session.maxSeats) {
      return NextResponse.json({ error: "Session is full" }, { status: 400 });
    }

    const signup = await db.ideaLabSignup.create({
      data: {
        sessionId: id,
        userId: user.id,
        role,
        status: "registered",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true, isFoundingMember: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
      },
    });

    return NextResponse.json({ signup }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/idealab/[id]/signup]", err);
    return NextResponse.json(
      { error: "Failed to register for session" },
      { status: 500 }
    );
  }
}
