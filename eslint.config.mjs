import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        process: "readonly"
      }
    },
    plugins: {
      js
    },
    rules: {
      // Suas regras aqui, se quiser
    },
    env: {
      browser: true,
      node: true
    },
    extends: ["eslint:recommended"]
  }
]);
