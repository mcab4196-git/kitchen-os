import { z } from "zod";

/**
 * Environment validation (N5). `src/instrumentation.ts` runs `checkEnv` once at
 * server start, so a misconfigured deploy fails at boot with a clear list instead
 * of erroring deep inside a request. Pure, so it's unit-tested without a real .env.
 */
const schema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    // AI_PROVIDER defaults to "gemini" (see server/ai/provider.ts); the key for
    // whichever provider is selected is required, the other one isn't.
    AI_PROVIDER: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().optional(),
    RECEIPTS_BUCKET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const provider = (env.AI_PROVIDER ?? "gemini").toLowerCase();
    const keyFor: Record<string, "GEMINI_API_KEY" | "ANTHROPIC_API_KEY"> = {
      gemini: "GEMINI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
    };
    const key = keyFor[provider];
    if (!key) {
      ctx.addIssue({ code: "custom", path: ["AI_PROVIDER"], message: `Unknown provider "${env.AI_PROVIDER}"; use gemini or anthropic` });
    } else if (!env[key]) {
      ctx.addIssue({ code: "custom", path: [key], message: `Required when AI_PROVIDER is ${provider}` });
    }
  });

export type Env = z.infer<typeof schema>;

export function checkEnv(
  raw: Record<string, string | undefined>
): { ok: true; env: Env } | { ok: false; errors: Record<string, string[] | undefined> } {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, env: parsed.data } : { ok: false, errors: parsed.error.flatten().fieldErrors };
}
