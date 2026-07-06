import nextPlugin from "@next/eslint-plugin-next";
import typescriptPlugin from "typescript-eslint";

export default [
  {
    ignores: [".next/**", "dist/**", "node_modules/**"],
  },
  ...typescriptPlugin.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
