// EU-14 allergen groups for the hard filter (N2) — pure, unit-tested.
//
// An allergy like "dairy" must also block butter, cheese and cream, not just the
// literal word. Each group lists what a person types for it (`aliases`), the food
// words that contain it (`terms`), and well-known look-alikes that don't (`except`,
// e.g. coconut milk for dairy). Terms match whole words, so "egg" doesn't catch
// "eggplant" and "nut" doesn't catch "coconut" or "nutmeg". When in doubt a term is
// included: wrongly dropping a recipe is safe, wrongly keeping one isn't. Filipino
// names are included because the app is for Philippine kitchens.

import { normName } from "./recipe";

export interface AllergenGroup {
  key: string;
  label: string;
  aliases: string[];
  terms: string[];
  except?: string[];
}

export const EU_ALLERGEN_GROUPS: AllergenGroup[] = [
  {
    key: "gluten",
    label: "Cereals containing gluten",
    aliases: ["gluten", "wheat", "cereal", "cereals containing gluten", "celiac", "coeliac"],
    terms: [
      "gluten", "wheat", "flour", "harina", "bread", "tinapay", "pandesal", "breadcrumb", "panko", "pasta",
      "spaghetti", "macaroni", "noodle", "miki", "canton", "misua", "ramen", "udon", "soba", "barley", "rye",
      "oat", "oatmeal", "spelt", "kamut", "semolina", "couscous", "bulgur", "seitan", "malt", "beer",
      "soy sauce", "toyo", "hoisin", "teriyaki", "oyster sauce", "lumpia", "siopao", "siomai", "wonton",
      "dumpling", "empanada", "ensaymada", "hopia", "biscuit", "cracker", "crouton", "cake", "pancake",
      "cupcake", "cookie", "waffle", "pastry", "pie", "pizza", "dough", "batter", "breading", "tortilla", "bun",
    ],
    except: [
      "gluten free", "rice flour", "corn flour", "corn starch", "potato starch", "cassava flour", "tapioca flour",
      "coconut flour", "almond flour", "rice noodle", "rice vermicelli", "bihon noodle", "sotanghon noodle",
      "glass noodle", "mung bean noodle", "shirataki noodle", "corn tortilla", "rice cake", "rice paper",
    ],
  },
  {
    key: "crustaceans",
    label: "Crustaceans",
    aliases: ["crustacean", "shellfish", "shell fish"],
    terms: [
      "shrimp", "prawn", "crab", "lobster", "crayfish", "crawfish", "langoustine", "scampi", "krill",
      "hipon", "sugpo", "alimango", "alimasag", "alamang", "bagoong", "kropek",
    ],
    except: ["crab apple"],
  },
  {
    key: "eggs",
    label: "Eggs",
    aliases: ["egg", "itlog"],
    terms: [
      "egg", "itlog", "mayonnaise", "mayo", "aioli", "meringue", "custard", "flan", "albumen", "balut",
      "penoy", "omelette", "omelet", "frittata", "quiche", "carbonara", "torta", "tortang", "eggnog",
    ],
    except: ["egg plant", "egg free"],
  },
  {
    key: "fish",
    label: "Fish",
    aliases: ["fish", "isda"],
    terms: [
      "fish", "isda", "salmon", "tuna", "cod", "haddock", "trout", "halibut", "snapper", "grouper", "herring",
      "sardine", "sardinas", "anchovy", "dilis", "mackerel", "tanigue", "tilapia", "bangus", "milkfish",
      "galunggong", "lapu lapu", "maya maya", "tuyo", "daing", "tinapa", "patis", "bagoong", "kikiam",
      "worcestershire", "caesar", "surimi", "bonito", "katsuobushi", "dashi",
    ],
  },
  {
    key: "peanuts",
    label: "Peanuts",
    aliases: ["peanut", "groundnut", "mani"],
    terms: ["peanut", "groundnut", "mani", "kare kare", "satay", "arachis"],
  },
  {
    key: "soy",
    label: "Soybeans",
    aliases: ["soy", "soya", "soybean", "soy bean"],
    terms: [
      "soy", "soya", "soybean", "toyo", "tofu", "tokwa", "taho", "tausi", "miso", "edamame", "tempeh",
      "natto", "tamari", "bean curd", "teriyaki", "hoisin",
    ],
  },
  {
    key: "milk",
    label: "Milk",
    aliases: ["milk", "dairy", "lactose", "gatas", "dairy product", "milk product"],
    terms: [
      "milk", "gatas", "leche", "butter", "mantikilya", "ghee", "cheese", "keso", "queso", "kesong puti",
      "parmesan", "mozzarella", "cheddar", "ricotta", "feta", "mascarpone", "brie", "gouda", "cream", "yogurt",
      "yoghurt", "whey", "casein", "lactose", "buttermilk", "custard", "bechamel", "pastillas", "ice cream",
    ],
    except: [
      "dairy free", "gata", "coconut milk", "coconut cream", "peanut butter", "cocoa butter", "nut butter",
      "almond butter", "cashew butter", "apple butter", "almond milk", "soy milk", "oat milk", "rice milk",
      "cream of tartar", "butter bean",
    ],
  },
  {
    key: "nuts",
    label: "Tree nuts",
    aliases: ["nut", "tree nut"],
    terms: [
      "nut", "almond", "hazelnut", "walnut", "cashew", "pecan", "brazil nut", "pistachio", "macadamia", "pili",
      "marzipan", "praline", "nutella", "pesto", "frangipane",
    ],
    except: ["nut free"],
  },
  {
    key: "celery",
    label: "Celery",
    aliases: ["celery", "celeriac", "kintsay"],
    terms: ["celery", "celeriac", "kintsay"],
  },
  {
    key: "mustard",
    label: "Mustard",
    aliases: ["mustard"],
    terms: ["mustard", "mustasa", "dijon"],
  },
  {
    key: "sesame",
    label: "Sesame",
    aliases: ["sesame", "sesame seed", "linga"],
    terms: ["sesame", "linga", "tahini", "hummus", "gomashio", "furikake", "halva"],
  },
  {
    key: "sulphites",
    label: "Sulphites",
    aliases: ["sulphite", "sulfite", "sulphur dioxide", "sulfur dioxide"],
    terms: [
      "sulphite", "sulfite", "metabisulphite", "metabisulfite", "sulphur dioxide", "sulfur dioxide", "wine",
      "sherry", "dried apricot", "raisin", "pasas", "dried fruit",
    ],
  },
  {
    key: "lupin",
    label: "Lupin",
    aliases: ["lupin", "lupine", "lupini"],
    terms: ["lupin", "lupine", "lupini"],
  },
  {
    key: "molluscs",
    label: "Molluscs",
    aliases: ["mollusc", "mollusk", "shellfish", "shell fish"],
    terms: [
      "mussel", "oyster", "clam", "scallop", "squid", "octopus", "cuttlefish", "calamari", "snail", "escargot",
      "abalone", "whelk", "cockle", "tahong", "talaba", "halaan", "tulya", "kabibe", "pusit", "pugita",
    ],
    except: ["oyster mushroom"],
  },
];

// Words whose trailing "s" isn't a plural. "gatas" (milk) must not shrink to "gata",
// which is coconut milk and must stay allowed for a dairy allergy.
const NO_STEM = new Set(["gatas"]);

function stem(w: string): string {
  if (NO_STEM.has(w)) return w;
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function words(s: string): string[] {
  return normName(s).split(" ").filter(Boolean).map(stem);
}

/** Index of `run` as a contiguous sequence inside `tokens`, or -1. */
function indexOfRun(tokens: string[], run: string[]): number {
  outer: for (let i = 0; i + run.length <= tokens.length; i++) {
    for (let j = 0; j < run.length; j++) if (tokens[i + j] !== run[j]) continue outer;
    return i;
  }
  return -1;
}

function withoutRuns(tokens: string[], runs: string[][]): string[] {
  let out = tokens;
  for (const run of runs) {
    let at: number;
    while (run.length > 0 && (at = indexOfRun(out, run)) !== -1) out = [...out.slice(0, at), ...out.slice(at + run.length)];
  }
  return out;
}

// Pre-split once: every check below compares word arrays.
const SPLIT = EU_ALLERGEN_GROUPS.map((g) => ({
  group: g,
  aliases: g.aliases.map((a) => words(a).join(" ")),
  terms: g.terms.map(words),
  except: (g.except ?? []).map(words),
}));

/** The EU-14 groups a typed allergy stands for: "dairy" → milk, "shellfish" → crustaceans + molluscs. */
export function allergenGroupsFor(allergy: string): AllergenGroup[] {
  const typed = words(allergy).join(" ");
  if (!typed) return [];
  return SPLIT.filter((s) => s.aliases.includes(typed)).map((s) => s.group);
}

/** Whether a food name (an ingredient, or a dish like "Kare-kare") contains the group's allergen. */
export function containsAllergen(text: string, group: AllergenGroup): boolean {
  const s = SPLIT.find((x) => x.group.key === group.key);
  if (!s) return false;
  const tokens = withoutRuns(words(text), s.except);
  return s.terms.some((term) => indexOfRun(tokens, term) !== -1);
}

/** For the AI prompt: "dairy (milk, butter, cheese, cream, yogurt, and anything made from them)". */
export function describeAllergy(allergy: string): string {
  const groups = allergenGroupsFor(allergy);
  if (groups.length === 0) return allergy;
  const examples = groups.flatMap((g) => g.terms.slice(0, 5));
  return `${allergy} (${examples.join(", ")}, and anything made from them)`;
}
