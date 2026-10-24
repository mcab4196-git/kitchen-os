/**
 * Runs once when the server starts (Next.js instrumentation). Validates the
 * environment (N5) so a missing or wrong setting stops the boot with a clear
 * list, instead of surfacing as an error deep inside some later request.
 */
export async function register() {
  // The edge runtime (middleware) only sees the public vars; validate on Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/env");
  const result = checkEnv(process.env);
  if (!result.ok) {
    console.error("❌ Invalid environment variables:", result.errors);
    throw new Error("Invalid environment variables. Compare your .env with .env.example.");
  }
}
