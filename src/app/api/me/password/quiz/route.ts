import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { issueQuiz } from "@/lib/human-test";

/**
 * GET /api/me/password/quiz
 *
 * Issues a fresh human-test quiz for the password-change flow.
 *
 * The correct answer is never returned — only the prompt, shuffled options,
 * and an opaque signed `challenge` token that the client echoes back on
 * POST /api/me/password. The challenge is single-use and expires in 60s.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }
    const quiz = issueQuiz();
    return NextResponse.json(quiz);
  } catch (err) {
    console.error("[GET /api/me/password/quiz]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
