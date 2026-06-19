import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// GET /api/idealab/[id] — one session with host, signups, interests
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.ideaLabSession.findUnique({
      where: { id },
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
        signups: {
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
          orderBy: { createdAt: "asc" },
        },
        interests: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                handle: true,
                avatarUrl: true,
            bio: true,
            location: true,
            skills: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { signups: true, interests: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("[GET /api/idealab/[id]]", err);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// PATCH /api/idealab/[id] — update a session (host only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const existing = await db.ideaLabSession.findUnique({
      where: { id },
      select: { hostId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (existing.hostId !== user.id) {
      return NextResponse.json(
        { error: "Only the host can update this session" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      title,
      thesis,
      description,
      scheduledAt,
      durationMins,
      status,
      agenda,
      rolesOpen,
      maxSeats,
      isPublic,
      coverColor,
    } = body as {
      title?: string;
      thesis?: string;
      description?: string;
      scheduledAt?: string;
      durationMins?: number;
      status?: string;
      agenda?: string;
      rolesOpen?: string;
      maxSeats?: number;
      isPublic?: boolean;
      coverColor?: string;
    };

    const data: any = {};
    if (title !== undefined) data.title = String(title);
    if (thesis !== undefined) data.thesis = String(thesis);
    if (description !== undefined)
      data.description = description ? String(description) : null;
    if (scheduledAt !== undefined) {
      const d = new Date(scheduledAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "scheduledAt is not a valid date" },
          { status: 400 }
        );
      }
      data.scheduledAt = d;
    }
    if (durationMins !== undefined) data.durationMins = Number(durationMins);
    if (status !== undefined) data.status = String(status);
    if (agenda !== undefined) data.agenda = agenda ? String(agenda) : null;
    if (rolesOpen !== undefined)
      data.rolesOpen = rolesOpen ? String(rolesOpen) : null;
    if (maxSeats !== undefined) data.maxSeats = Number(maxSeats);
    if (isPublic !== undefined) data.isPublic = Boolean(isPublic);
    if (coverColor !== undefined)
      data.coverColor = coverColor ? String(coverColor) : null;

    const updated = await db.ideaLabSession.update({
      where: { id },
      data,
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
        signups: {
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
        },
        _count: { select: { signups: true, interests: true } },
      },
    });

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("[PATCH /api/idealab/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
