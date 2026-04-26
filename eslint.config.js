// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disallow console outside of designated boot/logger modules
      "no-console": ["error", { allow: ["error", "warn"] }],
      // Enforce explicit return types for better type safety
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      // No floating promises — must await or void
      "@typescript-eslint/no-floating-promises": "error",
      // No non-null assertion — handle nullability explicitly
      "@typescript-eslint/no-non-null-assertion": "error",
      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
  {
    // Allow console in index.ts (bootstrap entry point)
    files: ["src/index.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.config.js", "*.config.ts"],
  },
);
