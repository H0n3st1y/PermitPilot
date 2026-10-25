import { defineConfig } from "@playwright/test";

// How Playwright runs the specs in e2e/
export default defineConfig({
  // Specs live next to the app, under e2e/
  testDir: "./e2e",
  // Whole-test budget, then a shorter wait for each expect
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // One worker keeps the storage tests in a single browser
  workers: 1,
  use: {
    // Override this when the app is already running somewhere else
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    browserName: "chromium",
    // Keep a trace and a screenshot when a test fails
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Production mode is opt-in. Otherwise start the dev server.
    command: process.env.PLAYWRIGHT_PRODUCTION ? "npm run start" : "npm run dev",
    url: "http://127.0.0.1:3000",
    // Locally, reuse a server that is already up. CI starts fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
