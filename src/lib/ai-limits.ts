// Per-user AI allowance (N6, PLAN 3.1): pure, unit-tested.
//
// Every receipt scan, round of dinner ideas and meal plan is an AI call, and the
// app is free and public, so one user can't use up the shared quota. The "day" is
// a rolling 24 hours, not a calendar day: the server runs in UTC (N7), so midnight
// there is 8 AM in Manila.

export type AiTask = "RECEIPT_SCAN" | "DINNER_IDEAS" | "MEAL_PLAN";

/** Owner's numbers, 2026-10-25. The cooldown stops repeat taps on "new ideas". */
export const AI_LIMITS: Record<AiTask, { perDay: number; cooldownSeconds: number }> = {
  RECEIPT_SCAN: { perDay: 10, cooldownSeconds: 0 },
  DINNER_IDEAS: { perDay: 20, cooldownSeconds: 30 },
  MEAL_PLAN: { perDay: 5, cooldownSeconds: 30 },
};

export const AI_WINDOW_MS = 24 * 60 * 60 * 1000;

export type AiAllowance = { ok: true } | { ok: false; reason: "daily" | "cooldown"; retryAt: Date };

/** Whether one more `task` call is allowed, given when this user's earlier ones were made. */
export function aiAllowance(task: AiTask, usedAt: Date[], now: Date): AiAllowance {
  const { perDay, cooldownSeconds } = AI_LIMITS[task];
  // A stamp slightly ahead of `now` (clock skew between servers) still counts.
  const recent = usedAt
    .map((d) => d.getTime())
    .filter((t) => now.getTime() - t < AI_WINDOW_MS)
    .sort((a, b) => a - b);

  if (recent.length >= perDay) {
    // A slot frees up when enough of the oldest calls leave the 24-hour window.
    return { ok: false, reason: "daily", retryAt: new Date(recent[recent.length - perDay] + AI_WINDOW_MS) };
  }
  const last = recent.at(-1);
  if (last !== undefined && now.getTime() - last < cooldownSeconds * 1000) {
    return { ok: false, reason: "cooldown", retryAt: new Date(last + cooldownSeconds * 1000) };
  }
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
  return `You've used today's ${AI_LIMITS[task].perDay} ${used}. You can ${again} ${when}.`;
}
