import { describe, it, expect } from "vitest";
import { listFrom, preferencesFromForm, PREFERENCE_DEFAULTS } from "./preferences-form";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("preferencesFromForm — Settings and sign-up share one reader", () => {
  it("gives a new account PHP, metric and the other defaults when onboarding is skipped", () => {
    expect(preferencesFromForm(form({}))).toEqual(PREFERENCE_DEFAULTS);
    expect(PREFERENCE_DEFAULTS.currency).toBe("PHP");
  });

  it("reads the onboarding fields and keeps defaults for the ones it doesn't ask", () => {
    const p = preferencesFromForm(
      form({ householdSize: "4", diet: "vegetarian", allergies: "peanuts, dairy", skill: "beginner", maxCookMinutes: "30" }),
    );
    expect(p).toMatchObject({ householdSize: 4, diet: "vegetarian", allergies: ["peanuts", "dairy"], skill: "beginner", maxCookMinutes: 30 });
    expect(p).toMatchObject({ currency: "PHP", unitSystem: "metric", expiringDays: 2 });
  });

  it("bounds what an untrusted form can send", () => {
    const p = preferencesFromForm(
      form({ householdSize: "999", maxCookMinutes: "1", expiringDays: "-3", skill: "wizard", diet: "carnivore", currency: "pesos", unitSystem: "cubits" }),
    );
    expect(p).toMatchObject({ householdSize: 20, maxCookMinutes: 10, expiringDays: 1, skill: "intermediate", diet: null, currency: "PHP", unitSystem: "metric" });
  });

  it("clears a list when the field is sent empty", () => {
    expect(preferencesFromForm(form({ allergies: "" }), { ...PREFERENCE_DEFAULTS, allergies: ["eggs"] }).allergies).toEqual([]);
  });
});

describe("listFrom", () => {
  it("trims, drops blanks and de-duplicates without caring about case", () => {
    expect(listFrom(" peanuts, Shellfish , ,PEANUTS ")).toEqual(["peanuts", "Shellfish"]);
  });

  it("caps the number and length of entries", () => {
    expect(listFrom(Array.from({ length: 50 }, (_, i) => `item${i}`).join(","))).toHaveLength(30);
    expect(listFrom("x".repeat(200))[0]).toHaveLength(60);
  });
});
