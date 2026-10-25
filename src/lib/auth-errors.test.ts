import { describe, it, expect } from "vitest";
import { signInErrorMessage, signUpErrorMessage } from "./auth-errors";

describe("signUpErrorMessage — Supabase's codes in plain words (PLAN 6.5)", () => {
  it("explains the email limit instead of 'email rate limit exceeded'", () => {
    const msg = signUpErrorMessage({ code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" });
    expect(msg).toMatch(/can't send a confirmation email right now/);
    expect(msg).not.toMatch(/rate limit/);
  });

  it("covers the other errors a tester can hit", () => {
    expect(signUpErrorMessage({ code: "email_address_not_authorized", message: "x" })).toMatch(/to that address yet/);
    expect(signUpErrorMessage({ code: "user_already_exists", message: "x" })).toMatch(/Sign in instead/);
    expect(signUpErrorMessage({ code: "weak_password", message: "x" })).toMatch(/stronger password/);
  });

  it("treats any 429 as 'too many tries' and keeps unknown errors as Supabase wrote them", () => {
    expect(signUpErrorMessage({ status: 429, message: "slow down" })).toMatch(/Too many tries/);
    expect(signUpErrorMessage({ code: "something_new", message: "Something new happened" })).toBe("Something new happened");
  });
});

describe("signInErrorMessage", () => {
  it("says what to do for wrong details and an unconfirmed email", () => {
    expect(signInErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toMatch(/don't match/);
    expect(signInErrorMessage({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/Confirm your email first/);
  });
});
