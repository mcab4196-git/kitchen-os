// AI provider abstraction (§18).
//
// The rest of the app depends ONLY on this interface, never on a specific vendor.
// Swapping providers = adding one class and changing getAIProvider(). Today the
// default is Anthropic; nothing else in the codebase knows or cares.

export interface RawReceiptItem {
  rawName: string;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  category: string | null;
}

export interface RawReceipt {
  store: string | null;
  purchaseDate: string | null; // ISO-ish string as returned by the model
  currency: string | null;
  total: number | null;
  items: RawReceiptItem[];
}

export interface ParseReceiptInput {
  base64: string; // image bytes, base64-encoded
  mediaType: string; // e.g. "image/jpeg"
}

export interface AIProvider {
  /** Extract structured grocery data from a receipt image. Output is UNVALIDATED —
   *  callers must validate + clean it before any DB write (see ai/schemas.ts). */
  parseReceipt(input: ParseReceiptInput): Promise<RawReceipt>;

  /** Propose recipes from available ingredients + preferences. Output is
   *  UNVALIDATED and its "available/missing" is NOT trusted — callers validate,
   *  hard-filter allergens, and reconcile against real inventory in code. */
  generateRecipe(input: GenerateRecipeInput): Promise<RawRecipe[]>;
}

export interface AvailableIngredient {
  name: string;
  quantity: number;
  unit: string;
  expiresInDays: number | null; // null = unknown; negative = already expired
}

export interface RecipePreferences {
  householdSize: number;
  diet: string | null;
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  skill: string;
  maxCookMinutes: number;
}

export interface GenerateRecipeInput {
  available: AvailableIngredient[];
  preferences: RecipePreferences;
  count: number;
  exclude?: string[]; // dish names already chosen (e.g. saved recipes) — don't repeat
}

export interface RawRecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
}

export interface RawRecipe {
  name: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: string;
  servings: number | null;
  ingredients: RawRecipeIngredient[];
  instructions: string[];
  storageNotes: string | null;
  leftoverNotes: string | null;
}

/**
 * Return the configured provider. Selected by AI_PROVIDER env (default
 * "gemini", the free-tier option). The import is dynamic so a build never
 * hard-links one vendor — and so an unused provider's SDK/key isn't required.
 */
export async function getAIProvider(): Promise<AIProvider> {
  const which = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  switch (which) {
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic-provider");
      return new AnthropicProvider();
    }
    case "gemini":
    default: {
      const { GeminiProvider } = await import("./gemini-provider");
      return new GeminiProvider();
    }
  }
}
