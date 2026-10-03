import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules", ".wrangler"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // El Worker corre en el runtime de Cloudflare (APIs web como fetch); los tests, en Node.
      globals: { ...globals.serviceworker, ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
