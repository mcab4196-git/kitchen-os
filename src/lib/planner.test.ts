import { describe, it, expect } from "vitest";
import { planMeals, type PlanCandidate } from "./planner";

const opts = { days: 3, maxCookMinutes: 60 };

describe("planMeals", () => {
  it("assigns distinct recipes and depletes shared ingredients", () => {
    // Two recipes both need chicken; only one chicken in stock. The second
    // (chicken-dependent) can't be planned once chicken is used.
    const candidates: PlanCandidate[] = [
      { id: "chicken-rice", ingredients: [{ name: "chicken breast" }, { name: "rice" }], totalMinutes: 30 },
      { id: "chicken-soup", ingredients: [{ name: "chicken breast" }, { name: "carrots" }], totalMinutes: 40 },
      { id: "veg-pasta", ingredients: [{ name: "pasta" }, { name: "tomatoes" }], totalMinutes: 25 },
    ];
    const inv = ["chicken breast", "rice", "carrots", "pasta", "tomatoes"];
    const plan = planMeals(candidates, inv, [], opts);

    expect(new Set(plan).size).toBe(plan.length); // no repeats
    expect(plan).toContain("veg-pasta");
    // Only one of the two chicken dishes can be planned (chicken depletes).
    const chickenPlanned = plan.filter((id) => id.startsWith("chicken")).length;
    expect(chickenPlanned).toBe(1);
  });

  it("prioritises recipes using soon-to-expire items first", () => {
    const candidates: PlanCandidate[] = [
      { id: "uses-spinach", ingredients: [{ name: "chicken breast" }, { name: "spinach" }], totalMinutes: 20 },
      { id: "no-spinach", ingredients: [{ name: "beef" }, { name: "rice" }], totalMinutes: 20 },
    ];
    const inv = ["chicken breast", "spinach", "beef", "rice"];
    const plan = planMeals(candidates, inv, ["spinach"], { ...opts, days: 2 });
    expect(plan[0]).toBe("uses-spinach"); // spinach is expiring -> cook it first
  });

  it("stops when nothing left is cookable (plan shorter than days)", () => {
    const candidates: PlanCandidate[] = [
      { id: "only-option", ingredients: [{ name: "chicken breast" }, { name: "rice" }], totalMinutes: 20 },
    ];
    const inv = ["chicken breast", "rice"];
    const plan = planMeals(candidates, inv, [], { ...opts, days: 5 });
    expect(plan).toEqual(["only-option"]); // one recipe -> one day
  });

  it("skips recipes whose required protein isn't available", () => {
    const candidates: PlanCandidate[] = [
      { id: "needs-fish", ingredients: [{ name: "salmon" }, { name: "rice" }], totalMinutes: 20 },
    ];
    const inv = ["rice", "salt", "oil"]; // no protein
    const plan = planMeals(candidates, inv, [], opts);
    expect(plan).toEqual([]);
  });
});
