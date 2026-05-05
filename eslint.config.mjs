// @ts-check
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "next-env.d.ts",
      "vitest.setup.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTs,
];

export default config;
