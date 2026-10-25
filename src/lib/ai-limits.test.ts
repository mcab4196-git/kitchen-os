import { describe, it, expect } from "vitest";
import { aiAllowance, allowanceMessage, waitText, AI_LIMITS, AI_SHARED_PER_DAY, AI_WINDOW_MS } from "./ai-limits";

const now = new Date("2026-10-25T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
/** n calls, one an hour apart, the oldest `n` hours ago. */
const hourly = (n: number) => Array.from({ length: n }, (_, i) => ago((i + 1) * HOUR));

const SCANS = AI_LIMITS.RECEIPT_SCAN.perDay;

describe("aiAllowance — per-user AI allowance (N6)", () => {
  it("allows a first call and calls under the daily limit", () => {
    expect(aiAllowance("RECEIPT_SCAN", [], now)).toEqual({ ok: true });
    expect(aiAllowance("RECEIPT_SCAN", hourly(SCANS - 1), now)).toEqual({ ok: true });
  });

  it("refuses at the limit, until the oldest call is 24 hours old", () => {
    const refusal = aiAllowance("RECEIPT_SCAN", hourly(SCANS), now); // oldest: SCANS hours ago
    expect(refusal).toEqual({ ok: false, reason: "daily", retryAt: new Date(now.getTime() + (24 - SCANS) * HOUR) });
  });

  it("counts a rolling 24 hours, not the calendar day", () => {
    expect(aiAllowance("RECEIPT_SCAN", Array.from({ length: SCANS }, () => ago(AI_WINDOW_MS)), now)).toEqual({ ok: true });
    expect(aiAllowance("RECEIPT_SCAN", Array.from({ length: SCANS }, () => ago(AI_WINDOW_MS - 1)), now).ok).toBe(false);
  });

  it("keeps each task's allowance separate", () => {
    const plans = hourly(AI_LIMITS.MEAL_PLAN.perDay);
    expect(aiAllowance("MEAL_PLAN", plans, now).ok).toBe(false);
    expect(aiAllowance("DINNER_IDEAS", plans, now)).toEqual({ ok: true });
  });

  it("makes repeat taps on new ideas wait out the cooldown", () => {
    const { cooldownSeconds } = AI_LIMITS.DINNER_IDEAS;
    expect(aiAllowance("DINNER_IDEAS", [ago(10 * 1000)], now)).toEqual({
      ok: false,
      reason: "cooldown",
      retryAt: new Date(now.getTime() - 10 * 1000 + cooldownSeconds * 1000),
    });
    expect(aiAllowance("DINNER_IDEAS", [ago(cooldownSeconds * 1000)], now)).toEqual({ ok: true });
  });

  it("lets scans follow one another (several receipts after one shop)", () => {
    expect(aiAllowance("RECEIPT_SCAN", [ago(1000)], now)).toEqual({ ok: true });
  });

  it("still counts a call stamped slightly ahead (clock skew between servers)", () => {
    const ahead = Array.from({ length: SCANS }, () => new Date(now.getTime() + 500));
    expect(aiAllowance("RECEIPT_SCAN", ahead, now).ok).toBe(false);
  });
});

describe("aiAllowance — the shared ceiling for everyone (PLAN 6.3)", () => {
  const everyone = (n: number, oldest = 20 * HOUR) =>
    Array.from({ length: n }, (_, i) => ago(oldest - i * (oldest / n)));

  it("allows calls while everyone together is under the ceiling", () => {
    expect(aiAllowance("RECEIPT_SCAN", [], now, everyone(AI_SHARED_PER_DAY - 1))).toEqual({ ok: true });
  });

  it("refuses at the ceiling even with the user's own allowance left", () => {
    const refusal = aiAllowance("RECEIPT_SCAN", [], now, everyone(AI_SHARED_PER_DAY));
    expect(refusal).toEqual({ ok: false, reason: "shared", retryAt: new Date(now.getTime() + 4 * HOUR) });
  });

  it("names the user's own limit first when both are reached", () => {
    expect(aiAllowance("RECEIPT_SCAN", hourly(SCANS), now, everyone(AI_SHARED_PER_DAY))).toMatchObject({ reason: "daily" });
  });
});

describe("waitText — rounds up, so coming back then works", () => {
  it("speaks in seconds, minutes, then hours", () => {
    expect(waitText(400)).toBe("in a second");
    expect(waitText(24_200)).toBe("in 25 seconds");
    expect(waitText(61 * 1000)).toBe("in 2 minutes");
    expect(waitText(59 * MIN)).toBe("in 59 minutes");
    expect(waitText(HOUR)).toBe("in about an hour");
    expect(waitText(2 * HOUR + 10 * MIN)).toBe("in about 3 hours");
  });
});

describe("allowanceMessage — plain words, with when to come back", () => {
  it("names the daily limit and when a slot frees up", () => {
    expect(allowanceMessage("RECEIPT_SCAN", { ok: false, reason: "daily", retryAt: new Date(now.getTime() + 14 * HOUR) }, now)).toBe(
      `You've used today's ${SCANS} receipt scans. You can scan again in about 14 hours.`,
    );
    expect(allowanceMessage("MEAL_PLAN", { ok: false, reason: "daily", retryAt: new Date(now.getTime() + 20 * MIN) }, now)).toBe(
      `You've used today's ${AI_LIMITS.MEAL_PLAN.perDay} meal plans. You can make another plan in 20 minutes.`,
    );
  });

  it("asks for a moment during the cooldown", () => {
    expect(allowanceMessage("DINNER_IDEAS", { ok: false, reason: "cooldown", retryAt: new Date(now.getTime() + 20 * 1000) }, now)).toBe(
      "Just a moment. You can get new ideas in 20 seconds.",
    );
  });

  it("explains the shared ceiling without blaming the user", () => {
    expect(allowanceMessage("DINNER_IDEAS", { ok: false, reason: "shared", retryAt: new Date(now.getTime() + 3 * HOUR) }, now)).toBe(
      "Kitchen OS has used today's shared AI allowance for the beta. You can get new ideas in about 3 hours.",
    );
  });
});
