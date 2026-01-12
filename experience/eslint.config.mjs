import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

const infraConfig = [
  // Base JavaScript recommendations
  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // Base rules (handled by TypeScript)
      "no-undef": "off",
      "no-unused-vars": "off",

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",

      // Complexity limits
      complexity: "off",
      "max-lines-per-function": "off",
    },
  },

  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "**/*.config.{js,mjs,cjs}",
    ],
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
      complexity: "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default [
  ...infraConfig,
  {
    ignores: ["web/.next/**", ".expo/**", "dist/**"],
  },
];
