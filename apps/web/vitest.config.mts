import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next preserves JSX for its compiler; tests need React's automatic transform.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
