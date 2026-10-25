import Anthropic from "@anthropic-ai/sdk";
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
 * Default vision provider. Uses tool-use to force structured JSON output — the
 * reliable way to get schema-shaped data out of the model. The model string is
 * env-configurable (ANTHROPIC_MODEL); Anthropic's guidance is to pin an exact
 * model ID in production and verify it in the console.
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  }

  async parseReceipt({ base64, mediaType }: ParseReceiptInput): Promise<RawReceipt> {
    const images = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const isPdf = mediaType === "application/pdf";
    if (!images.includes(mediaType) && !isPdf) {
      throw new Error(`Unsupported file type "${mediaType}". Use a JPEG, PNG, WebP, or PDF.`);
    }

    // Images go in an image block; PDFs go in a document block (Claude reads
    // both the text and the visual layout of the PDF natively).
    const mediaBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 },
        };

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      tools: [
        {
          name: "record_receipt",
          description: "Record the structured grocery data extracted from a receipt image.",
          input_schema: {
            type: "object",
            properties: {
              store: { type: ["string", "null"], description: "Store/merchant name if visible." },
              purchaseDate: { type: ["string", "null"], description: "Purchase date in YYYY-MM-DD if visible." },
              currency: { type: ["string", "null"], description: "ISO currency code, e.g. EUR, USD." },
              total: { type: ["number", "null"], description: "Grand total if visible." },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rawName: { type: "string", description: "Product line text exactly as printed." },
                    quantity: { type: ["number", "null"], description: "Numeric quantity if present." },
                    unit: { type: ["string", "null"], description: "Unit if present, e.g. g, kg, ml, l, pcs." },
                    price: { type: ["number", "null"], description: "Line price if present." },
                    category: {
                      type: "string",
                      enum: [...RECEIPT_CATEGORIES],
                      description: "Best fit for what the product is.",
                    },
                  },
                  required: ["rawName", "category"],
                },
              },
            },
            required: ["items"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_receipt" },
      messages: [
        {
          role: "user",
          content: [
            mediaBlock,
            {
              type: "text",
              text: `${RECEIPT_PROMPT} Call the record_receipt tool with the result.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return structured receipt data.");
    }
    // Untrusted — caller validates with validateAndClean().
    return toolUse.input as RawReceipt;
  }

  async generateRecipe(input: GenerateRecipeInput): Promise<RawRecipe[]> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      tools: [
        {
          name: "record_recipes",
          description: "Record the suggested recipes.",
          input_schema: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: ["string", "null"] },
                    prepMinutes: { type: ["number", "null"] },
                    cookMinutes: { type: ["number", "null"] },
                    difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
                    servings: { type: ["number", "null"] },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: ["number", "null"] },
                          unit: { type: ["string", "null"] },
                          optional: { type: "boolean" },
                        },
                        required: ["name"],
                      },
                    },
                    instructions: { type: "array", items: { type: "string" } },
                    storageNotes: { type: ["string", "null"] },
                    leftoverNotes: { type: ["string", "null"] },
                  },
                  required: ["name", "ingredients", "instructions"],
                },
              },
            },
            required: ["recipes"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_recipes" },
      messages: [{ role: "user", content: [{ type: "text", text: buildRecipePrompt(input) }] }],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return structured recipe data.");
    }
    const out = toolUse.input as { recipes?: RawRecipe[] };
    return out.recipes ?? [];
  }
}
