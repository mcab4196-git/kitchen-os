import type { Config } from "tailwindcss";

/**
 * Kitchen OS design tokens.
 *
 * A calm basil-green brand on a warm near-white surface. Colours are wired to CSS
 * custom properties (channel triples) declared in globals.css, so the same class
 * names resolve to a light or dark palette from a single `prefers-color-scheme`
 * switch — components never branch on theme.
 *
 * The expiry-status scale is functional: `critical / soon / fresh / unknown`
 * carry meaning. Each has three roles — `*-fg` (AA-legible text), a base value
 * (dot / graphic fill), and `*-bg` / `*-border` (tint + hairline) — because one
 * hex cannot be both readable body text and a correct fill.
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: c("--surface"),
        "surface-2": c("--surface-2"),
        card: c("--card"),
        ink: c("--ink"),
        muted: c("--muted"),
        faint: c("--faint"),
        line: c("--line"),
        "line-strong": c("--line-strong"),
        brand: {
          DEFAULT: c("--brand"),
          soft: c("--brand-soft"),
          ink: c("--brand-ink"),
          contrast: c("--brand-contrast"),
        },
        accent: {
          DEFAULT: c("--accent"),
          soft: c("--accent-soft"),
          fg: c("--accent-fg"),
        },
        status: {
          critical: c("--status-critical"),
          "critical-fg": c("--status-critical-fg"),
          "critical-bg": c("--status-critical-bg"),
          "critical-border": c("--status-critical-border"),
          soon: c("--status-soon"),
          "soon-fg": c("--status-soon-fg"),
          "soon-bg": c("--status-soon-bg"),
          "soon-border": c("--status-soon-border"),
          fresh: c("--status-fresh"),
          "fresh-fg": c("--status-fresh-fg"),
          "fresh-bg": c("--status-fresh-bg"),
          "fresh-border": c("--status-fresh-border"),
          unknown: c("--status-unknown"),
          "unknown-fg": c("--status-unknown-fg"),
          "unknown-bg": c("--status-unknown-bg"),
          "unknown-border": c("--status-unknown-border"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Semantic steps layered on top of the Tailwind defaults.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "title-sm": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.014em" }],
        "title": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
        "title-lg": ["2.125rem", { lineHeight: "2.375rem", letterSpacing: "-0.024em" }],
        "display": ["2.75rem", { lineHeight: "2.9rem", letterSpacing: "-0.028em" }],
        "read": ["1.0625rem", { lineHeight: "1.7rem" }], // recipe steps / long copy
      },
      borderRadius: {
        control: "0.7rem",
        card: "1rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        xs: "0 1px 1px rgb(var(--shadow) / 0.04)",
        card: "0 1px 2px rgb(var(--shadow) / 0.04), 0 6px 20px rgb(var(--shadow) / 0.05)",
        pop: "0 4px 12px rgb(var(--shadow) / 0.08), 0 16px 48px rgb(var(--shadow) / 0.14)",
        nav: "0 -1px 0 rgb(var(--line) / 1), 0 -8px 24px rgb(var(--shadow) / 0.04)",
        "focus": "0 0 0 2px rgb(var(--surface) / 1), 0 0 0 4px rgb(var(--brand) / 1)",
      },
      maxWidth: {
        app: "480px", // mobile content column
        content: "760px", // tablet / desktop reading column
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
        nav: "var(--nav-h)",
        "nav-gap": "calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.5rem)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        DEFAULT: "180ms",
        slow: "280ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "indeterminate": {
          "0%": { transform: "translateX(-100%) scaleX(0.4)" },
          "50%": { transform: "translateX(20%) scaleX(0.6)" },
          "100%": { transform: "translateX(120%) scaleX(0.4)" },
        },
        "status-beat": {
          "0%, 100%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.06)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out both",
        "slide-up-fade": "slide-up-fade 0.22s cubic-bezier(0.2,0.8,0.2,1) both",
        "pop-in": "pop-in 0.18s cubic-bezier(0.2,0.8,0.2,1) both",
        "toast-in": "toast-in 0.28s cubic-bezier(0.2,0.8,0.2,1) both",
        indeterminate: "indeterminate 1.15s ease-in-out infinite",
        "status-beat": "status-beat 0.5s ease-out 1",
      },
    },
  },
  plugins: [],
};
export default config;
