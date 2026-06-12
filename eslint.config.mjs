import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prettier/prettier": "error"
    }
  },
  pluginJs.configs.recommended,
  eslintConfigPrettier
];
