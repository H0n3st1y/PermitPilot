import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// How Vitest loads the unit tests
export default defineConfig({
  // Next preserves JSX for its compiler; tests need React's automatic transform.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    // These tests run in Node
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Same @/ alias the Next app uses
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
