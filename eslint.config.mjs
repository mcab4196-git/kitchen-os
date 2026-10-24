// ESLint flat config (PLAN 2.1): Next.js core-web-vitals + TypeScript rules.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // Generated output, dependencies and vendored Claude skills aren't ours to lint.
  { ignores: [".next/**", "node_modules/**", ".claude/**", "next-env.d.ts", "prisma/migrations/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // A leading underscore marks a deliberately unused parameter, e.g. a Server
      // Action's `_prev` state, which the signature requires but the action ignores.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
