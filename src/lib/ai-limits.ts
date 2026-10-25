// AI allowance (N6, PLAN 3.1 and 6.3): pure, unit-tested.
//
// Every receipt scan, round of dinner ideas and meal plan is an AI call, and the
// app is free, so no one user can use up the shared quota. The "day" is a rolling
// 24 hours, not a calendar day: the server runs in UTC (N7), so midnight there is
// 8 AM in Manila.

export type AiTask = "RECEIPT_SCAN" | "DINNER_IDEAS" | "MEAL_PLAN";

/**
 * Per user, per 24 hours (closed beta, 2026-10-25; the owner asked Claude to set them).
 * Generous for real use (a shop or two, a few rounds of ideas, a plan) at 21 calls
 * at most. The cooldown stops repeat taps on "new ideas".
 */
export const AI_LIMITS: Record<AiTask, { perDay: number; cooldownSeconds: number }> = {
  RECEIPT_SCAN: { perDay: 8, cooldownSeconds: 0 },
  DINNER_IDEAS: { perDay: 10, cooldownSeconds: 30 },
  MEAL_PLAN: { perDay: 3, cooldownSeconds: 30 },
};

/**
 * Everyone together, all tasks, per 24 hours. Every user shares one AI key and its
 * daily quota, so a busy day for a few testers can't spend it for all of them.
 */
export const AI_SHARED_PER_DAY = 200;

export const AI_WINDOW_MS = 24 * 60 * 60 * 1000;

export type AiAllowance = { ok: true } | { ok: false; reason: "daily" | "cooldown" | "shared"; retryAt: Date };

/** When the next slot frees up, if `limit` calls already sit in the window; null if one is free. */
function windowFull(usedAt: Date[], limit: number, now: Date): Date | null {
  // A stamp slightly ahead of `now` (clock skew between servers) still counts.
  const recent = usedAt
    .map((d) => d.getTime())
    .filter((t) => now.getTime() - t < AI_WINDOW_MS)
    .sort((a, b) => a - b);
  // A slot frees up when enough of the oldest calls leave the 24-hour window.
  return recent.length >= limit ? new Date(recent[recent.length - limit] + AI_WINDOW_MS) : null;
}

/**
 * Whether one more `task` call is allowed, given when this user's earlier calls of
 * that task were made and (optionally) when everyone's calls were made.
 */
export function aiAllowance(task: AiTask, usedAt: Date[], now: Date, everyoneUsedAt: Date[] = []): AiAllowance {
  const { perDay, cooldownSeconds } = AI_LIMITS[task];

  const mine = windowFull(usedAt, perDay, now);
  if (mine) return { ok: false, reason: "daily", retryAt: mine };

  const last = Math.max(...usedAt.map((d) => d.getTime()).filter((t) => now.getTime() - t < AI_WINDOW_MS), -Infinity);
  if (now.getTime() - last < cooldownSeconds * 1000) {
    return { ok: false, reason: "cooldown", retryAt: new Date(last + cooldownSeconds * 1000) };
  }

  const shared = windowFull(everyoneUsedAt, AI_SHARED_PER_DAY, now);
  if (shared) return { ok: false, reason: "shared", retryAt: shared };

  return { ok: true };
}

const WORDING: Record<AiTask, { used: string; again: string }> = {
  RECEIPT_SCAN: { used: "receipt scans", again: "scan again" },
  DINNER_IDEAS: { used: "rounds of dinner ideas", again: "get new ideas" },
  MEAL_PLAN: { used: "meal plans", again: "make another plan" },
};

/** "in 25 seconds" / "in 4 minutes" / "in about 3 hours". Rounds up, so coming back then works. */
export function waitText(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds < 60) return seconds === 1 ? "in a second" : `in ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "in a minute" : `in ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "in about an hour" : `in about ${hours} hours`;
}

/** The plain message shown when a call is refused. */
export function allowanceMessage(task: AiTask, refusal: Extract<AiAllowance, { ok: false }>, now: Date): string {
  const { used, again } = WORDING[task];
  const when = waitText(refusal.retryAt.getTime() - now.getTime());
  if (refusal.reason === "cooldown") return `Just a moment. You can ${again} ${when}.`;
  if (refusal.reason === "shared") {
    return `Kitchen OS has used today's shared AI allowance for the beta. You can ${again} ${when}.`;
  }
  return `You've used today's ${AI_LIMITS[task].perDay} ${used}. You can ${again} ${when}.`;
}
