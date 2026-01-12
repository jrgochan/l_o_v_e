/**
 * Prettier configuration for L.O.V.E. platform
 * Canonical configuration maintained in infra/configs/
 * 
 * This is the ES module version (alternative to .prettierrc.json)
 * Use this format when you need to add custom logic or plugins
 */

/** @type {import("prettier").Config} */
const config = {
  semi: true,
  trailingComma: "es5",
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  arrowParens: "always",
  bracketSpacing: true,
  proseWrap: "preserve",
  quoteProps: "as-needed",
  
  // Language-specific overrides
  overrides: [
    {
      files: "*.md",
      options: {
        proseWrap: "always",
        printWidth: 80,
      },
    },
    {
      files: "*.json",
      options: {
        printWidth: 80,
      },
    },
  ],
};

export default config;
