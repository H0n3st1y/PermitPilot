import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Lets us reuse Next's older "extends" style inside flat config
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
// Skip build output, then pull in Next's recommended rules
const config = [{ ignores: [".next/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] }, ...compat.extends("next/core-web-vitals", "next/typescript")];
export default config;
