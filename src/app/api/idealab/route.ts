import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { deriveSessionStatus } from "@/lib/preship";

const STATUS_ORDER: Record<string, number> = {
  live: 0,
  scheduled: 1,
  ended: 2,
};

function randLetters(n: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < n; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randDigits(n: number) {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

async function generateInviteCode() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `PRESHIP-${randLetters(2)}-${randDigits(2)}`;
    const existing = await db.ideaLabSession.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `PRESHIP-${randLetters(3)}-${randDigits(3)}`;
}

// GET /api/idealab — list sessions
// Query params: ?status=scheduled|live|ended, ?public=1, ?mine=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const onlyPublic = searchParams.get("public") === "1";
    const onlyMine = searchParams.get("mine") === "1";

    const user = await getCurrentUser();

    // NOTE: we deliberately do NOT push `status` into the Prisma where clause.
    // The stored status only changes on explicit host action, so filtering at
    // the DB level would surface stale rows (the "always Live" / "perpetually
    // Upcoming" bug). Instead we fetch a bounded page, derive the effective
    // status for each row, and filter in JS below so ?status= matches reality.
    const where: any = {};
    if (onlyPublic) where.isPublic = true;

    if (onlyMine) {
      if (!user) return NextResponse.json({ sessions: [] });
      const [mySignups, myInterests] = await Promise.all([
        db.ideaLabSignup.findMany({
          where: { userId: user.id },
          select: { sessionId: true },
        }),
        db.ideaLabInterest.findMany({
          where: { userId: user.id },
          select: { sessionId: true },
        }),
      ]);
      const ids = new Set<string>([
        ...mySignups.map((s) => s.sessionId),
        ...myInterests.map((i) => i.sessionId),
      ]);
      where.id = { in: [...ids] };
    }

    const sessions = await db.ideaLabSession.findMany({
      where,
      // Bound the board; unbounded findMany grows linearly with the table.
      take: 50,
      include: {
        host: {
          // List-card select — bio/location/skills only render in the detail
          // view. Trimming keeps the board payload lean.
          select: {
            id: true,
            name: true,
            handle: true,
            title: true,
            avatarUrl: true, isFoundingMember: true,
          },
        },
        _count: { select: { signups: true, interests: true } },
      },
    });

    // Derive the effective status for each session at read time, so abandoned
    // live rooms and no-show scheduled ones reflect reality without a cron job.
    const derived = sessions.map((s) => ({
      ...s,
      status: deriveSessionStatus(s.status, s.scheduledAt, s.durationMins),
    }));

    // Attach current-user specific data
    let mySignupMap = new Map<string, { role: string; status: string }>();
    let myInterestSet = new Set<string>();
    if (user && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      const [mySignups, myInterests] = await Promise.all([
        db.ideaLabSignup.findMany({
          where: { userId: user.id, sessionId: { in: sessionIds } },
          select: { sessionId: true, role: true, status: true },
        }),
        db.ideaLabInterest.findMany({
          where: { userId: user.id, sessionId: { in: sessionIds } },
          select: { sessionId: true },
        }),
      ]);
      mySignupMap = new Map(
        mySignups.map((s) => [
          s.sessionId,
          { role: s.role, status: s.status },
        ])
      );
      myInterestSet = new Set(myInterests.map((i) => i.sessionId));
    }

    // Decorate with current-user state. Built from `derived` so the effective
    // status is carried through to the client.
    const decorated = derived.map((s) => ({
      ...s,
      mySignup: mySignupMap.get(s.id) ?? null,
      myInterest: myInterestSet.has(s.id),
    }));

    // Apply the ?status= filter AFTER derivation, so it matches the effective
    // status (a stored-"scheduled" session whose start time has passed is
    // effectively live, and a stored-"live" session whose window ended is
    // effectively ended).
    const filtered = status
      ? decorated.filter((s) => s.status === status)
      : decorated;

    filtered.sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 99;
      const sb = STATUS_ORDER[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      return (
        new Date(a.scheduledAt).getTime() -
        new Date(b.scheduledAt).getTime()
      );
    });

    return NextResponse.json({ sessions: filtered });
  } catch (err) {
    console.error("[GET /api/idealab]", err);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}

// POST /api/idealab — create a session as the current user (becomes host)
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

    const {
      title,
      thesis,
      description,
      scheduledAt,
      durationMins,
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
      agenda?: string;
      rolesOpen?: string;
      maxSeats?: number;
      isPublic?: boolean;
      coverColor?: string;
    };

    if (!title || !thesis || !scheduledAt) {
      return NextResponse.json(
        { error: "title, thesis and scheduledAt are required" },
        { status: 400 }
      );
    }

    const scheduledAtDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledAtDate.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt is not a valid date" },
        { status: 400 }
      );
    }

    const inviteCode = await generateInviteCode();

    const session = await db.ideaLabSession.create({
      data: {
        title: String(title),
        thesis: String(thesis),
        description: description ? String(description) : null,
        hostId: user.id,
        scheduledAt: scheduledAtDate,
        durationMins: durationMins != null ? Number(durationMins) : undefined,
        agenda: agenda ? String(agenda) : null,
        rolesOpen: rolesOpen ? String(rolesOpen) : null,
        inviteCode,
        maxSeats: maxSeats != null ? Number(maxSeats) : undefined,
        isPublic: isPublic != null ? Boolean(isPublic) : undefined,
        coverColor: coverColor ? String(coverColor) : undefined,
        signups: {
          create: {
            userId: user.id,
            role: "host",
            status: "confirmed",
          },
        },
      },
      include: {
        host: {
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
        signups: {
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
        },
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/idealab]", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
