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

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i;
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * The origin for links we email (the sign-up confirmation). A configured public
 * NEXT_PUBLIC_SITE_URL wins. Without one (or when it still says localhost), the site
 * the request came to: a deploy missing the setting sent people to localhost:3000.
 * Supabase still only follows origins on its redirect allow-list, so a forged Host
 * header can't send anyone elsewhere.
 */
export function emailLinkOrigin(
  configured: string | undefined,
  host: string | null,
  forwardedProto: string | null,
): string {
  if (configured && !LOCAL.test(configured)) return configured.replace(/\/+$/, "");
  if (host && HOST.test(host)) {
    const proto = forwardedProto?.split(",")[0].trim().toLowerCase();
    const scheme = proto === "http" || proto === "https" ? proto : PRIVATE_HOST.test(host) ? "http" : "https";
    return `${scheme}://${host}`;
  }
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}
