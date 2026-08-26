import type { Config } from "tailwindcss";

/**
 * Kitchen OS design tokens.
 * Deliberately not the cream/terracotta default: a calm basil-green brand on a
 * warm near-white surface, with a functional expiry-status scale whose colors
 * carry real meaning (critical / soon / fresh / unknown) rather than decoration.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#FBFAF7",
        card: "#FFFFFF",
        ink: "#1C1B19",
        muted: "#6F6E68",
        line: "#E9E6DF",
        brand: {
          DEFAULT: "#2F5D50", // basil
          soft: "#EAF1EE",
          ink: "#1E3E36",
        },
        accent: {
          DEFAULT: "#E8833A", // warm amber — primary actions, used sparingly
          soft: "#FBEBDC",
        },
        // Functional expiry status — these encode information, not style.
        status: {
          critical: "#C64A3B",
          soon: "#D9932E",
          fresh: "#4E9C6B",
          unknown: "#8A8A82",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgba(28,27,25,0.04), 0 4px 16px rgba(28,27,25,0.05)",
      },
      maxWidth: { app: "480px" }, // mobile-first content column
    },
  },
  plugins: [],
};
export default config;
