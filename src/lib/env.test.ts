import { describe, it, expect } from "vitest";
import { checkEnv } from "./env";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  DATABASE_URL: "postgresql://u:p@host:6543/postgres",
};

describe("checkEnv — fail at boot, not mid-request (N5)", () => {
  it("accepts a Gemini setup (the default provider) with its key", () => {
    const r = checkEnv({ ...base, GEMINI_API_KEY: "g" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("requires the key for the selected provider only", () => {
    const gemini = checkEnv({ ...base, AI_PROVIDER: "gemini" });
    expect(gemini.ok).toBe(false);
    if (!gemini.ok) expect(gemini.errors.GEMINI_API_KEY).toBeDefined();

    const anthropic = checkEnv({ ...base, AI_PROVIDER: "Anthropic", GEMINI_API_KEY: "g" });
    expect(anthropic.ok).toBe(false);
    if (!anthropic.ok) expect(anthropic.errors.ANTHROPIC_API_KEY).toBeDefined();

    expect(checkEnv({ ...base, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "a" }).ok).toBe(true);
  });

  it("rejects an unknown provider and missing core settings", () => {
    const unknown = checkEnv({ ...base, AI_PROVIDER: "openai", GEMINI_API_KEY: "g" });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors.AI_PROVIDER).toBeDefined();

    const missing = checkEnv({ GEMINI_API_KEY: "g" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(missing.errors.DATABASE_URL).toBeDefined();
    }
  });
});
