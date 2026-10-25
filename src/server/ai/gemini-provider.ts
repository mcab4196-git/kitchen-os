import { GoogleGenAI, Type } from "@google/genai";
import type {
  AIProvider,
  ParseReceiptInput,
  RawReceipt,
  GenerateRecipeInput,
  RawRecipe,
} from "./provider";
import { buildRecipePrompt } from "./recipe-prompt";
import { RECEIPT_CATEGORIES, RECEIPT_PROMPT } from "./schemas";

/**
 * Free-tier vision provider (Google Gemini). Uses responseSchema to get
 * structured JSON directly. Handles images and PDFs (same inlineData block).
 * Model is env-configurable; verify a current free model in Google AI Studio.
 *
 * Privacy note: on Gemini's free tier Google may use inputs to improve models.
 * Acceptable for a personal build; enable billing to opt out.
 */
export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
    this.ai = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  async parseReceipt({ base64, mediaType }: ParseReceiptInput): Promise<RawReceipt> {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(mediaType)) {
      throw new Error(`Unsupported file type "${mediaType}". Use a JPEG, PNG, WebP, or PDF.`);
    }

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { inlineData: { mimeType: mediaType, data: base64 } },
        { text: RECEIPT_PROMPT },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            store: { type: Type.STRING, nullable: true },
            purchaseDate: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD if visible" },
            currency: { type: Type.STRING, nullable: true, description: "ISO code, e.g. EUR" },
            total: { type: Type.NUMBER, nullable: true },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rawName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER, nullable: true },
                  unit: { type: Type.STRING, nullable: true },
                  price: { type: Type.NUMBER, nullable: true },
                  category: {
                    type: Type.STRING,
                    format: "enum",
                    enum: [...RECEIPT_CATEGORIES],
                    description: "Best fit for what the product is",
                  },
                },
                required: ["rawName", "category"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned no content.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }
    // Untrusted — caller validates with validateAndClean().
    return parsed as RawReceipt;
  }

  async generateRecipe(input: GenerateRecipeInput): Promise<RawRecipe[]> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ text: buildRecipePrompt(input) }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING, nullable: true },
              prepMinutes: { type: Type.NUMBER, nullable: true },
              cookMinutes: { type: Type.NUMBER, nullable: true },
              difficulty: { type: Type.STRING, enum: ["EASY", "MEDIUM", "HARD"] },
              servings: { type: Type.NUMBER, nullable: true },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER, nullable: true },
                    unit: { type: Type.STRING, nullable: true },
                    optional: { type: Type.BOOLEAN },
                  },
                  required: ["name"],
                },
              },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              storageNotes: { type: Type.STRING, nullable: true },
              leftoverNotes: { type: Type.STRING, nullable: true },
            },
            required: ["name", "ingredients", "instructions"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned no content.");
    try {
      return JSON.parse(text) as RawRecipe[];
    } catch {
      throw new Error("Gemini returned invalid JSON for recipes.");
    }
  }
}
