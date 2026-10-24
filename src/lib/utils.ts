/**
 * Class-name joiner with a small, deterministic conflict resolver.
 *
 * No external dependency (the project deliberately avoids one). It only dedupes
 * the utility groups this codebase actually overrides on primitives — sizing,
 * spacing, radius, shadow, font size/weight, display, gap, leading — and for
 * those the *last* occurrence wins, which is the intuitive contract when a call
 * site passes an override via `className`. Anything it doesn't recognise is
 * passed through untouched, so it can never silently drop a class it isn't sure
 * about.
 */

const SIZE_WORDS =
  "(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|2xs|title|title-sm|title-lg|display|read)";
const WEIGHT_WORDS =
  "(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)";
const DISPLAY_WORDS =
  "(block|inline-block|inline|flex|inline-flex|grid|inline-grid|contents|hidden|table|flow-root)";

/** Returns a stable group key for classes that must not coexist, else null. */
function groupKey(cls: string): string | null {
  // strip a responsive / state prefix like "sm:" or "hover:" — conflicts are
  // resolved per-variant, so "h-10 sm:h-12" is left alone.
  const bang = cls.startsWith("!");
  const raw = bang ? cls.slice(1) : cls;
  const lastColon = raw.lastIndexOf(":");
  const variant = lastColon === -1 ? "" : raw.slice(0, lastColon + 1);
  const base = lastColon === -1 ? raw : raw.slice(lastColon + 1);

  const m = (re: RegExp) => re.test(base);
  let key: string | null = null;

  if (m(/^-?m[trblxyse]?-/)) key = "m" + (base.match(/^-?m([trblxyse]?)-/)?.[1] ?? "");
  else if (m(/^-?p[trblxyse]?-/)) key = "p" + (base.match(/^-?p([trblxyse]?)-/)?.[1] ?? "");
  else if (m(/^(w|min-w|max-w)-/)) key = base.match(/^(w|min-w|max-w)-/)![1];
  else if (m(/^(h|min-h|max-h)-/)) key = base.match(/^(h|min-h|max-h)-/)![1];
  else if (m(/^size-/)) key = "size";
  else if (m(/^rounded(-(tl|tr|br|bl|ss|se|ee|es|[trblse]))?(-[a-z0-9[]|$)/)) {
    // Group by the corner set it targets: bare `rounded` / `rounded-lg` (all
    // corners) is one group; `rounded-t*` / `rounded-l*` etc. are their own.
    const side = base.match(/^rounded-(tl|tr|br|bl|ss|se|ee|es|[trblse])(-|$)/)?.[1] ?? "all";
    key = "rounded:" + side;
  } else if (m(/^shadow(-|$)/)) key = "shadow";
  else if (m(new RegExp(`^text-${SIZE_WORDS}$`)) || m(/^text-\[[\d.]+(px|rem|em)\]$/)) key = "fontSize";
  else if (m(new RegExp(`^font-${WEIGHT_WORDS}$`))) key = "fontWeight";
  else if (m(new RegExp(`^${DISPLAY_WORDS}$`))) key = "display";
  else if (m(/^gap(-(x|y))?-/)) key = "gap" + (base.match(/^gap(-(?:x|y))?-/)?.[1] ?? "");
  else if (m(/^leading-/)) key = "leading";
  else if (m(/^(items|justify|content)-/)) key = base.match(/^(items|justify|content)-/)![1];

  return key === null ? null : variant + key + (bang ? "!" : "");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** For ids that arrive in a URL or form: anything else would make Postgres throw on a `@db.Uuid` column. */
export function isUuid(s: string): boolean {
  return UUID.test(s);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  const tokens: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const t of part.split(/\s+/)) if (t) tokens.push(t);
  }

  // Walk right-to-left; the first time we see a group, that class wins.
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    const key = groupKey(t);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(t);
  }
  return out.reverse().join(" ");
}
