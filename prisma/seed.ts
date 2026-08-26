import { PrismaClient, StorageLocation } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed reference data. Idempotent: safe to re-run (uses upserts on unique keys).
 * This data is what makes the expiry engine and ingredient normalization useful
 * on day one, before the user has entered anything.
 */

const CATEGORIES: { name: string; storage: StorageLocation }[] = [
  { name: "Meat", storage: "REFRIGERATOR" },
  { name: "Fish", storage: "REFRIGERATOR" },
  { name: "Dairy", storage: "REFRIGERATOR" },
  { name: "Vegetable", storage: "REFRIGERATOR" },
  { name: "Fruit", storage: "REFRIGERATOR" },
  { name: "Bakery", storage: "PANTRY" },
  { name: "Grain", storage: "PANTRY" },
  { name: "Pantry", storage: "PANTRY" },
  { name: "Frozen", storage: "FREEZER" },
  { name: "Condiment", storage: "REFRIGERATOR" },
  { name: "Beverage", storage: "PANTRY" },
  { name: "Other", storage: "OTHER" },
];

// canonicalName, category, defaultUnit, freezable, typicalPieceGrams, aliases[]
const INGREDIENTS: [string, string, string, boolean, number | null, string[]][] = [
  ["chicken breast", "Meat", "g", true, 170, ["chicken breast fillet", "chicken filet", "chicken fillet", "chicken breasts"]],
  ["minced beef", "Meat", "g", true, null, ["ground beef", "beef mince", "hackfleisch"]],
  ["salmon fillet", "Fish", "g", true, 150, ["salmon", "salmon filet"]],
  ["milk", "Dairy", "ml", false, null, ["whole milk", "semi-skimmed milk", "vollmilch"]],
  ["eggs", "Dairy", "pcs", false, 60, ["egg", "large eggs", "medium eggs"]],
  ["butter", "Dairy", "g", true, null, ["unsalted butter", "salted butter"]],
  ["cheddar cheese", "Dairy", "g", false, null, ["cheddar", "mature cheddar"]],
  ["spinach", "Vegetable", "g", true, null, ["baby spinach", "fresh spinach"]],
  ["tomatoes", "Vegetable", "g", false, 120, ["tomato", "vine tomatoes", "cherry tomatoes"]],
  ["onion", "Vegetable", "pcs", false, 110, ["onions", "brown onion", "yellow onion"]],
  ["garlic", "Vegetable", "pcs", false, 5, ["garlic clove", "garlic cloves", "garlic bulb"]],
  ["mushrooms", "Vegetable", "g", false, null, ["mushroom", "button mushrooms", "chestnut mushrooms"]],
  ["potatoes", "Vegetable", "g", false, 150, ["potato", "baking potato"]],
  ["carrots", "Vegetable", "g", false, 70, ["carrot"]],
  ["bell pepper", "Vegetable", "pcs", false, 150, ["pepper", "capsicum", "red pepper", "paprika"]],
  ["banana", "Fruit", "pcs", true, 120, ["bananas"]],
  ["apple", "Fruit", "pcs", false, 180, ["apples"]],
  ["bread", "Bakery", "g", true, null, ["loaf", "sliced bread", "sourdough"]],
  ["rice", "Grain", "g", false, null, ["white rice", "basmati rice", "long grain rice"]],
  ["penne pasta", "Grain", "g", false, null, ["penne", "pasta", "penne rigate", "barilla penne rigate"]],
  ["spaghetti", "Grain", "g", false, null, ["spaghetti pasta"]],
  ["olive oil", "Pantry", "ml", false, null, ["extra virgin olive oil", "evoo"]],
  ["soy sauce", "Condiment", "ml", false, null, ["light soy sauce", "dark soy sauce"]],
];

// [ingredientCanonical | null, categoryName | null, storage, opened, typical, min, max]
const SHELF_LIFE: [string | null, string | null, StorageLocation, boolean, number, number, number][] = [
  // Ingredient-specific rules
  ["chicken breast", null, "REFRIGERATOR", false, 2, 1, 2],
  ["chicken breast", null, "FREEZER", false, 270, 180, 365],
  ["minced beef", null, "REFRIGERATOR", false, 2, 1, 2],
  ["salmon fillet", null, "REFRIGERATOR", false, 2, 1, 3],
  ["milk", null, "REFRIGERATOR", false, 7, 5, 10],
  ["milk", null, "REFRIGERATOR", true, 4, 3, 5],
  ["eggs", null, "REFRIGERATOR", false, 28, 21, 35],
  ["spinach", null, "REFRIGERATOR", false, 4, 3, 5],
  ["tomatoes", null, "REFRIGERATOR", false, 7, 5, 10],
  ["bread", null, "PANTRY", false, 4, 3, 6],
  ["bread", null, "FREEZER", false, 90, 60, 120],
  ["rice", null, "PANTRY", false, 730, 365, 1095],
  ["penne pasta", null, "PANTRY", false, 730, 365, 1095],
  // ── Category-level fallbacks: a full category × storage matrix ──
  // Used whenever there's no ingredient-specific rule. Values are general
  // guidance (days), tuned so estimates are useful but conservative.

  // REFRIGERATOR
  [null, "Meat", "REFRIGERATOR", false, 3, 2, 4],
  [null, "Fish", "REFRIGERATOR", false, 2, 1, 3],
  [null, "Dairy", "REFRIGERATOR", false, 10, 7, 14],
  [null, "Vegetable", "REFRIGERATOR", false, 7, 4, 10],
  [null, "Fruit", "REFRIGERATOR", false, 7, 5, 14],
  [null, "Bakery", "REFRIGERATOR", false, 7, 5, 10],
  [null, "Grain", "REFRIGERATOR", false, 4, 3, 6],
  [null, "Condiment", "REFRIGERATOR", false, 90, 30, 365],
  [null, "Beverage", "REFRIGERATOR", false, 7, 4, 14],
  [null, "Other", "REFRIGERATOR", false, 4, 3, 7],

  // FREEZER — freezing extends shelf life dramatically
  [null, "Meat", "FREEZER", false, 240, 180, 365],
  [null, "Fish", "FREEZER", false, 180, 90, 270],
  [null, "Dairy", "FREEZER", false, 90, 30, 120],
  [null, "Vegetable", "FREEZER", false, 300, 240, 365],
  [null, "Fruit", "FREEZER", false, 300, 240, 365],
  [null, "Bakery", "FREEZER", false, 90, 60, 120],
  [null, "Grain", "FREEZER", false, 180, 120, 365],
  [null, "Condiment", "FREEZER", false, 180, 90, 365],
  [null, "Beverage", "FREEZER", false, 120, 60, 365],
  [null, "Frozen", "FREEZER", false, 180, 90, 365],
  [null, "Other", "FREEZER", false, 120, 60, 180],

  // PANTRY / CUPBOARD (cupboard falls back to pantry in the engine)
  [null, "Fruit", "PANTRY", false, 6, 3, 14],
  [null, "Vegetable", "PANTRY", false, 7, 3, 21],
  [null, "Grain", "PANTRY", false, 365, 180, 730],
  [null, "Pantry", "PANTRY", false, 365, 180, 730],
  [null, "Bakery", "PANTRY", false, 4, 3, 7],
  [null, "Condiment", "PANTRY", false, 365, 180, 730],
  [null, "Beverage", "PANTRY", false, 180, 90, 365],
  [null, "Meat", "PANTRY", false, 2, 1, 3], // cautious: fresh meat shouldn't sit out
  [null, "Fish", "PANTRY", false, 1, 1, 2],
  [null, "Dairy", "PANTRY", false, 2, 1, 5],
  [null, "Other", "PANTRY", false, 60, 14, 180],
];

// unit, kind, toBaseFactor (base units: MASS=g, VOLUME=ml, COUNT=pcs)
const UNITS: [string, "MASS" | "VOLUME" | "COUNT", number][] = [
  ["g", "MASS", 1],
  ["kg", "MASS", 1000],
  ["mg", "MASS", 0.001],
  ["oz", "MASS", 28.3495],
  ["lb", "MASS", 453.592],
  ["ml", "VOLUME", 1],
  ["l", "VOLUME", 1000],
  ["cl", "VOLUME", 10],
  ["tsp", "VOLUME", 4.929],
  ["tbsp", "VOLUME", 14.787],
  ["cup", "VOLUME", 240],
  ["pcs", "COUNT", 1],
  ["clove", "COUNT", 1],
  ["slice", "COUNT", 1],
];

async function main() {
  console.log("Seeding categories…");
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { defaultStorageLocation: c.storage },
      create: { name: c.name, defaultStorageLocation: c.storage },
    });
  }

  console.log("Seeding unit conversions…");
  for (const [unit, kind, factor] of UNITS) {
    await prisma.unitConversion.upsert({
      where: { unit },
      update: { kind, toBaseFactor: factor },
      create: { unit, kind, toBaseFactor: factor },
    });
  }

  console.log("Seeding ingredients + aliases…");
  const catByName = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.name, c.id])
  );

  for (const [name, cat, unit, freezable, piece, aliases] of INGREDIENTS) {
    const ing = await prisma.ingredient.upsert({
      where: { canonicalName: name },
      update: { categoryId: catByName[cat], defaultUnit: unit, freezable, typicalPieceGrams: piece },
      create: {
        canonicalName: name,
        categoryId: catByName[cat],
        defaultUnit: unit,
        freezable,
        typicalPieceGrams: piece,
      },
    });
    // canonical name is itself an alias, plus the listed variants
    for (const alias of [name, ...aliases]) {
      await prisma.ingredientAlias.upsert({
        where: { aliasText: alias.toLowerCase() },
        update: {},
        create: { ingredientId: ing.id, aliasText: alias.toLowerCase(), source: "SEED", confidence: 1 },
      });
    }
  }

  console.log("Seeding shelf-life rules…");
  const ingByName = Object.fromEntries(
    (await prisma.ingredient.findMany()).map((i) => [i.canonicalName, i.id])
  );
  // Clear + reinsert shelf-life rules so re-seeding stays consistent.
  await prisma.shelfLifeRule.deleteMany({});
  for (const [ingName, catName, storage, opened, typical, min, max] of SHELF_LIFE) {
    await prisma.shelfLifeRule.create({
      data: {
        ingredientId: ingName ? ingByName[ingName] : null,
        categoryName: catName,
        storage,
        opened,
        typicalDays: typical,
        minDays: min,
        maxDays: max,
        source: "seed",
      },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    ingredients: await prisma.ingredient.count(),
    aliases: await prisma.ingredientAlias.count(),
    shelfLifeRules: await prisma.shelfLifeRule.count(),
    units: await prisma.unitConversion.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
