import type { GenerateRecipeInput } from "./provider";

/** Build the recipe-generation instruction shared by all providers. */
export function buildRecipePrompt(input: GenerateRecipeInput): string {
  const { available, preferences: p, count } = input;

  // Surface soon-to-expire items first — this is the whole point.
  const sorted = [...available].sort((a, b) => {
    const av = a.expiresInDays ?? 9999;
    const bv = b.expiresInDays ?? 9999;
    return av - bv;
  });
  const lines = sorted.map((i) => {
    const exp =
      i.expiresInDays == null
        ? ""
        : i.expiresInDays < 0
        ? " (EXPIRED)"
        : i.expiresInDays <= 3
        ? ` (use within ${i.expiresInDays}d!)`
        : ` (${i.expiresInDays}d left)`;
    return `- ${i.name}: ${i.quantity} ${i.unit}${exp}`;
  });

  const constraints: string[] = [`Serve ${p.householdSize} people.`, `Keep total time under ${p.maxCookMinutes} minutes.`, `Cook skill: ${p.skill}.`];
  if (p.diet) constraints.push(`Diet: ${p.diet}.`);
  if (p.allergies.length) constraints.push(`MUST NOT contain (allergies): ${p.allergies.join(", ")}.`);
  if (p.dislikes.length) constraints.push(`Avoid disliked foods: ${p.dislikes.join(", ")}.`);
  if (p.cuisines.length) constraints.push(`Prefer these cuisines when it fits: ${p.cuisines.join(", ")}.`);
  if (input.exclude && input.exclude.length) {
    constraints.push(`Do NOT suggest these dishes (already chosen): ${input.exclude.join(", ")}.`);
  }

  return [
    `Suggest ${count} realistic dinner recipes I can cook mostly from what I have.`,
    ``,
    `INGREDIENTS I HAVE (prioritise the ones expiring soonest):`,
    ...lines,
    ``,
    `RULES:`,
    ...constraints.map((c) => `- ${c}`),
    `- Strongly favour recipes that use up the items expiring soonest.`,
    `- It's fine to require a few common extra ingredients; list them, but minimise them.`,
    `- Use the ingredient names above verbatim when a recipe uses one of my items.`,
    `- Give clear step-by-step instructions. Do not invent quantities I must have.`,
  ].join("\n");
}
