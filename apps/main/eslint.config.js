import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { plugin as shadcn } from "@shadcn/lint";
import tseslint from "typescript-eslint";

const nextCoreWebVitalsWithoutTypescript = nextCoreWebVitals.filter(
  (config) => config.name !== "next/typescript",
);

export default tseslint.config(
  {
    ignores: [".next"],
  },
  // An ignores-only config is global, so scope only Next's rule-bearing entries.
  ...nextCoreWebVitalsWithoutTypescript.map((config) =>
    config.files || config.rules
      ? {
          ...config,
          ignores: [...(config.ignores ?? []), "src/components/ui/**/*"],
        }
      : config,
  ),
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["src/components/ui/**/*"],
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
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-restyle": ["warn", { allow: ["layout"] }],
      "shadcn/no-raw-colors": "warn",
      "shadcn/no-arbitrary-values": "warn",
      "shadcn/no-inline-styles": "warn",
      "shadcn/require-static-classes": "warn",
      "shadcn/no-unknown-classes": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/components/ui/**/*"],
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["src/components/ui/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },
);
