import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// POST /api/idealab/join — join a session via invite code (case-insensitive)
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

    const inviteCode = (body as { inviteCode?: string }).inviteCode;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { error: "inviteCode is required" },
        { status: 400 }
      );
    }

    const normalized = inviteCode.trim().toUpperCase();

    // SQLite does not support Prisma's `mode: "insensitive"`; fetch all
    // candidates and compare case-insensitively in JS. inviteCode is unique,
    // so the list is bounded by the number of sessions.
    const candidates = await db.ideaLabSession.findMany({
      select: { id: true, inviteCode: true },
    });
    const match = candidates.find(
      (s) => s.inviteCode.toUpperCase() === normalized
    );

    if (!match) {
      return NextResponse.json(
        { error: "Session not found for that invite code" },
        { status: 404 }
      );
    }

    const session = await db.ideaLabSession.findUnique({
      where: { id: match.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found for that invite code" },
        { status: 404 }
      );
    }

    const existing = await db.ideaLabSignup.findUnique({
      where: {
        sessionId_userId: { sessionId: session.id, userId: user.id },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json({ session, signup: existing });
    }

    const activeCount = await db.ideaLabSignup.count({
      where: {
        sessionId: session.id,
        status: { in: ["confirmed", "registered"] },
      },
    });
    if (activeCount >= session.maxSeats) {
      return NextResponse.json({ error: "Session is full" }, { status: 400 });
    }

    const signup = await db.ideaLabSignup.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        role: "participant",
        status: "registered",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true,
            bio: true,
            location: true,
            skills: true,
          },
        },
      },
    });

    return NextResponse.json({ session, signup }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/idealab/join]", err);
    return NextResponse.json(
      { error: "Failed to join session" },
      { status: 500 }
    );
  }
}
