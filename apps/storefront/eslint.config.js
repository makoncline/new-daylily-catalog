import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const nextCoreWebVitalsWithoutTypescript = nextCoreWebVitals.filter(
  (config) => config.name !== "next/typescript",
);

export default tseslint.config(
  { ignores: [".next", "playwright-report", "test-results"] },
  ...nextCoreWebVitalsWithoutTypescript,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    languageOptions: { parserOptions: { projectService: true } },
    linterOptions: { reportUnusedDisableDirectives: true },
  },
);
