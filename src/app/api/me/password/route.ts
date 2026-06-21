import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { verifyQuiz } from "@/lib/human-test";

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;

/**
 * POST /api/me/password
 *
 * Changes the current founder's password after three security checks:
 *   1. Human-test quiz — verifies a freshly-issued signed challenge so
 *      automated/abuse attempts can't proceed. The answer is never on the
 *      client; the client echoes back the opaque `challenge` token plus its
 *      selected answer.
 *   2. Current password — must match the stored hash. Prevents a hijacked
 *      session (or a forgetful user) from silently rotating the password.
 *   3. New-password rules — min length, must differ from the current one.
 *
 * On success the stored scrypt `salt:hash` is replaced and 200 is returned.
 * The passwordHash column is the single source of truth, so the change is
 * effective immediately for the next credentials login.
 *
 * Body: { currentPassword, newPassword, challenge, quizAnswer }
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
    const {
      currentPassword,
      newPassword,
      challenge,
      quizAnswer,
    } = body as Record<string, unknown>;

    // --- sanity: all four fields must be present + strings ---
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof challenge !== "string" ||
      typeof quizAnswer !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // --- check 1: human-test quiz (signature + expiry + answer) ---
    if (!verifyQuiz(challenge, quizAnswer)) {
      return NextResponse.json(
        { error: "Human test failed — please answer the quiz again" },
        { status: 400 }
      );
    }

    // --- check 2: current password must verify ---
    // Users without a passwordHash (legacy seed/demo users) can't change
    // password here — they have nothing to verify against.
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "This account has no password set" },
        { status: 400 }
      );
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // --- check 3: new-password rules ---
    if (newPassword.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD} characters` },
        { status: 400 }
      );
    }
    if (newPassword.length > MAX_PASSWORD) {
      return NextResponse.json(
        { error: "Password is too long" },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current one" },
        { status: 400 }
      );
    }

    // --- update ---
    const passwordHash = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/me/password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
