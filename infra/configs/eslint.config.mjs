/**
 * ESLint configuration for L.O.V.E. platform
 * Canonical configuration maintained in infra/configs/
 *
 * This is a base configuration for TypeScript/React projects
 * Individual modules (like Next.js apps) can extend this with framework-specific rules
 */

import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
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
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",

      // Complexity limits
      "complexity": ["warn", 15],
      "max-lines-per-function": ["warn", 100],
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
];

export default config;
