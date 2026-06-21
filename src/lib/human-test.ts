import { createHmac, timingSafeEqual } from "crypto";

/**
 * Simple human-test quiz for sensitive actions (password change).
 *
 * Design goals:
 *  - The correct answer is NEVER sent to the client. The server issues a
 *    signed challenge token (HMAC of the question + answer + nonce) that the
 *    client echoes back on submit. The server verifies the signature and
 *    compares the user's answer with timingSafeEqual.
 *  - The challenge is single-use and short-lived (60s) to limit replay.
 *  - Questions are deliberately trivial (elementary arithmetic / obvious
 *    picks) — this is a "are you a human" gate, not a captcha alternative.
 *    Its job is to stop automated/abuse password-change attempts, not to
 *    defeat a determined attacker who already has the session.
 *
 * Env: HUMAN_TEST_SECRET (falls back to NEXTAUTH_SECRET which is required
 * by NextAuth in prod, so no extra config is strictly needed).
 */

const QUIZ_TTL_MS = 60_000; // 60 seconds

type QuizQuestion = {
  prompt: string;
  /** canonical lowercase answer string */
  answer: string;
  /** shuffled options for multiple-choice render */
  options: string[];
};

/** Small pool of human-test questions — arithmetic + obvious single-word. */
function makeQuestion(): QuizQuestion {
  const pool: (() => QuizQuestion)[] = [
    () => {
      const a = 2 + Math.floor(Math.random() * 4); // 2..5
      const b = 1 + Math.floor(Math.random() * 4); // 1..4
      const answer = String(a + b);
      return {
        prompt: `What is ${a} + ${b}?`,
        answer,
        options: shuffle([answer, String(Number(answer) + 1), String(Number(answer) - 1)]),
      };
    },
    () => {
      const a = 5 + Math.floor(Math.random() * 5); // 5..9
      const b = 1 + Math.floor(Math.random() * 4); // 1..4
      const answer = String(a - b);
      return {
        prompt: `What is ${a} − ${b}?`,
        answer,
        options: shuffle([answer, String(Number(answer) + 2), String(Number(answer) - 1)]),
      };
    },
    () => {
      const a = 2 + Math.floor(Math.random() * 3); // 2..4
      const b = 2 + Math.floor(Math.random() * 3); // 2..4
      const answer = String(a * b);
      return {
        prompt: `What is ${a} × ${b}?`,
        answer,
        options: shuffle([answer, String(Number(answer) + a), String(Number(answer) - 2 < 0 ? Number(answer) + 1 : Number(answer) - 2)]),
      };
    },
    () => {
      const opts = [
        { word: "apple", q: "A red fruit that keeps the doctor away?" },
        { word: "sun", q: "The bright star you see in the daytime sky?" },
        { word: "water", q: "The clear liquid you drink to stay alive?" },
        { word: "fire", q: "The hot thing a candle flame is made of?" },
      ];
      const pick = opts[Math.floor(Math.random() * opts.length)];
      return {
        prompt: pick.q,
        answer: pick.word,
        options: shuffle([pick.word, ...distractors(pick.word)]),
      };
    },
  ];
  return pool[Math.floor(Math.random() * pool.length)]();
}

function distractors(word: string): string[] {
  const all = ["stone", "cloud", "metal", "paper", "grass", "river"];
  return shuffle(all.filter((w) => w !== word)).slice(0, 2);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function secret(): string {
  return (
    process.env.HUMAN_TEST_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "preship-dev-human-test-secret"
  );
}

/**
 * Issue a fresh quiz: returns the public-facing prompt/options and a signed
 * challenge token that encodes the canonical answer. The token is opaque to
 * the client.
 */
export function issueQuiz(): {
  prompt: string;
  options: string[];
  challenge: string;
  /** ms unix timestamp by which the challenge expires */
  expiresAt: number;
} {
  const q = makeQuestion();
  const expiresAt = Date.now() + QUIZ_TTL_MS;
  const nonce = Math.random().toString(36).slice(2);
  const challenge = sign({ answer: q.answer, expiresAt, nonce });
  return { prompt: q.prompt, options: q.options, challenge, expiresAt };
}

/**
 * Verify a submitted answer against a challenge token. Returns true only if:
 *  - the signature is valid,
 *  - the challenge has not expired,
 *  - the submitted answer matches the canonical answer.
 *
 * Timing-safe on the answer comparison. Constant false on any malformed
 * input so an attacker can't distinguish "bad token" from "wrong answer".
 */
export function verifyQuiz(challenge: string | undefined, submitted: string | undefined): boolean {
  if (!challenge || !submitted) return false;
  const payload = unsign(challenge);
  if (!payload) return false; // bad signature / shape
  if (Date.now() > payload.expiresAt) return false; // expired

  const a = Buffer.from(String(submitted).trim().toLowerCase());
  const b = Buffer.from(payload.answer);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(p: { answer: string; expiresAt: number; nonce: string }): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function unsign(token: string): { answer: string; expiresAt: number; nonce: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  // timing-safe compare of the signature
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof parsed?.answer !== "string" ||
      typeof parsed?.expiresAt !== "number" ||
      typeof parsed?.nonce !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Password strength heuristic — returns a 0..4 score and a short label.
 * Not a substitute for server-side rules (the API enforces min length), but
 * gives the UI a meter to encourage stronger passwords.
 */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "empty" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels: Record<number, string> = {
    0: "very weak",
    1: "weak",
    2: "fair",
    3: "strong",
    4: "very strong",
  };
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}
