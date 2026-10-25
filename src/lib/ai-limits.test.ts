import { describe, it, expect } from "vitest";
import { aiAllowance, allowanceMessage, waitText, AI_LIMITS, AI_WINDOW_MS } from "./ai-limits";

const now = new Date("2026-10-25T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe("aiAllowance — per-user AI allowance (N6)", () => {
  it("allows a first call and calls under the daily limit", () => {
    expect(aiAllowance("RECEIPT_SCAN", [], now)).toEqual({ ok: true });
    const nine = Array.from({ length: 9 }, (_, i) => ago((i + 1) * HOUR));
    expect(aiAllowance("RECEIPT_SCAN", nine, now)).toEqual({ ok: true });
  });

  it("refuses at the limit, until the oldest call is 24 hours old", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ago((i + 1) * HOUR)); // oldest: 10 h ago
    const refusal = aiAllowance("RECEIPT_SCAN", ten, now);
    expect(refusal).toEqual({ ok: false, reason: "daily", retryAt: new Date(now.getTime() + 14 * HOUR) });
  });

  it("counts a rolling 24 hours, not the calendar day", () => {
    const yesterday = Array.from({ length: 10 }, () => ago(AI_WINDOW_MS));
    expect(aiAllowance("RECEIPT_SCAN", yesterday, now)).toEqual({ ok: true });
    const justInside = Array.from({ length: 10 }, () => ago(AI_WINDOW_MS - 1));
    expect(aiAllowance("RECEIPT_SCAN", justInside, now).ok).toBe(false);
  });

  it("keeps each task's allowance separate", () => {
    const five = Array.from({ length: 5 }, (_, i) => ago((i + 1) * HOUR));
    expect(aiAllowance("MEAL_PLAN", five, now).ok).toBe(false);
    expect(aiAllowance("DINNER_IDEAS", five, now)).toEqual({ ok: true });
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
    const ahead = Array.from({ length: 10 }, () => new Date(now.getTime() + 500));
    expect(aiAllowance("RECEIPT_SCAN", ahead, now).ok).toBe(false);
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
      "You've used today's 10 receipt scans. You can scan again in about 14 hours.",
    );
    expect(allowanceMessage("MEAL_PLAN", { ok: false, reason: "daily", retryAt: new Date(now.getTime() + 20 * MIN) }, now)).toBe(
      "You've used today's 5 meal plans. You can make another plan in 20 minutes.",
    );
  });

  it("asks for a moment during the cooldown", () => {
    expect(allowanceMessage("DINNER_IDEAS", { ok: false, reason: "cooldown", retryAt: new Date(now.getTime() + 20 * 1000) }, now)).toBe(
      "Just a moment. You can get new ideas in 20 seconds.",
    );
  });
});
