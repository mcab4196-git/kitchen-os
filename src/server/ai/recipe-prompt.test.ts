import { describe, it, expect } from "vitest";
import { buildRecipePrompt } from "./recipe-prompt";
import type { GenerateRecipeInput } from "./provider";

const base: GenerateRecipeInput = {
  available: [
    { name: "rice", quantity: 500, unit: "g", expiresInDays: 30 },
    { name: "chicken breast", quantity: 500, unit: "g", expiresInDays: 1 }, // expiring soonest
    { name: "spinach", quantity: 100, unit: "g", expiresInDays: 10 },
  ],
  preferences: {
    householdSize: 3,
    diet: "pescatarian",
    allergies: ["peanuts"],
    dislikes: ["cilantro"],
    cuisines: ["thai"],
    skill: "beginner",
    maxCookMinutes: 30,
  },
  count: 3,
};

describe("buildRecipePrompt", () => {
  it("lists the soonest-expiring ingredient first", () => {
    const p = buildRecipePrompt(base);
    const chickenIdx = p.indexOf("chicken breast");
    const riceIdx = p.indexOf("rice");
    expect(chickenIdx).toBeGreaterThan(-1);
    expect(chickenIdx).toBeLessThan(riceIdx); // expiring item appears before the shelf-stable one
    expect(p).toContain("use within 1d");
  });

  it("encodes the hard and soft constraints", () => {
    const p = buildRecipePrompt(base);
    expect(p).toContain("Serve 3 people");
    expect(p).toContain("under 30 minutes");
    expect(p).toMatch(/allergies.*peanuts/i);
    expect(p).toContain("pescatarian");
    expect(p).toContain("cilantro");
    expect(p).toContain("thai");
  });

  it("includes an exclude list when provided", () => {
    const p = buildRecipePrompt({ ...base, exclude: ["Adobong Puti"] });
    expect(p).toMatch(/already chosen.*Adobong Puti/i);
  });
});
