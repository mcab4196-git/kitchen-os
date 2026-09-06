import { z } from "zod";

/**
 * Validate environment variables once, at startup. Public vars are required.
 * AI + storage vars are optional so the app runs before M2 is configured;
 * receipt scanning fails gracefully with a clear message if they're missing.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  // M2 (optional until receipt scanning is used). AI_PROVIDER defaults to
  // "gemini" (see server/ai/provider.ts); set the matching key for whichever
  // provider you deploy with.
  AI_PROVIDER: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  RECEIPTS_BUCKET: z.string().optional(),
});

const isServer = typeof window === "undefined";
const parsed = schema.safeParse(process.env);

if (isServer && !parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — see .env.example");
}

export const env = (parsed.success ? parsed.data : (process.env as any)) as z.infer<typeof schema>;
