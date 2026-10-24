// Safe post-login redirects (N3) — pure, unit-tested.

// A throwaway origin for parsing: only whether `next` stays on it matters.
const BASE = "http://kitchen-os.invalid";

/**
 * Where to send someone after the email-confirm callback. Only a path on our own
 * site is allowed; anything else (`.evil.com`, `@evil.com`, `//evil.com`,
 * `/\evil.com`, a full URL) falls back, so the link can't bounce people off-site.
 * The URL parser decides, because browsers treat `\` and stripped tabs as `/`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/")) return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return url.pathname + url.search + url.hash;
}
