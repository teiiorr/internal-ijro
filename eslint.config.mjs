import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // BIIB dizayn-tizimi gardi: o'rta nuqta «·» ajratuvchi sifatida taqiqlangan (qoida #3).
  // Tire «—», vergul yoki bo'sh joydan foydalaning. Kerak bo'lsa qatorda eslint-disable.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXText[value=/\\u00b7/]", message: "BIIB: o'rta nuqta «·» taqiqlangan — tire «—», vergul yoki bo'sh joy ishlating." },
        { selector: "Literal[value=/\\u00b7/]", message: "BIIB: o'rta nuqta «·» taqiqlangan (dizayn qoidasi #3)." },
        { selector: "TemplateElement[value.raw=/\\u00b7/]", message: "BIIB: o'rta nuqta «·» taqiqlangan (dizayn qoidasi #3)." },
      ],
    },
  },
]);

export default eslintConfig;
