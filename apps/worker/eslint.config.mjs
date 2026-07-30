import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Inlined from what used to be @certiva/config/eslint/base. That module had
// exactly one consumer — this file — so the indirection cost a package export,
// a dependency edge and a second file to open, and bought nothing: the API and
// web apps each keep their own config and never extended it.
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
