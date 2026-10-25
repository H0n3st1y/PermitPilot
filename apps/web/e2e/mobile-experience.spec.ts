import { expect, test, type Page } from "@playwright/test";

// Fail the test if the page is wider than the window
async function fitsPage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

// Check the main screens at phone, tablet, and desktop sizes
for (const [width, height] of [[320, 740], [430, 932], [768, 1024], [1440, 900]]) {
  // Public pages and every dashboard tab should fit, with no script errors
  test(`main screens fit ${width} × ${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    // Skip the first-run guide so it does not cover the page
    await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
    // Collect script errors and fail later if any show up
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Public pages, including a project id that does not exist
    for (const route of ["/", "/login", "/intake", "/about", "/projects/missing-project"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      // The missing id should show the not-found heading
      if (route.includes("missing-project")) await expect(page.getByRole("heading", { name: "Project not found" })).toBeVisible();
      await fitsPage(page);
      await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "_") || "home"}.png`), fullPage: true });
    }
    // Open the sample project, then walk every dashboard tab
    await page.goto("/demo");
    await page.waitForURL("**/projects/**");
    await expect(page.getByRole("heading", { name: "Harbor Kitchen", exact: true })).toBeVisible();
    // Open each dashboard tab and check that it fits
    for (const name of ["Roadmap", "Graph", "Timeline", "Documents", "Fees", "Inspections"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toBeVisible();
      // Roadmap's panel id is "overview". The other tabs match their names.
      await expect(page.getByRole("tabpanel")).toHaveAttribute("id", `panel-${name === "Roadmap" ? "overview" : name.toLowerCase()}`);
      // The graph tab is the one with a step picker
      if (name === "Graph") await expect(page.locator("#graph-step-picker")).toBeVisible();
      await fitsPage(page);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }
    // No script errors on any of those screens
    expect(errors).toEqual([]);
  });
}

// Menu, keyboard tabs, a rejected upload, and progress that survives reload
test("phone navigation, keyboard tabs, document recovery and persistent progress", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Skip the guide so the menu and tabs are what we are testing
  await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
  await page.goto("/");
  // Open the menu, then Escape should close it and return focus
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "New project", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();

  // Home and End should jump between the first and last tabs
  await page.goto("/demo");
  await page.waitForURL("**/projects/**");
  await page.getByRole("tab", { name: "Graph", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Inspections", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toBeFocused();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  // A text file is rejected. A PDF is kept, then removal leaves an undo note.
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("bad") });
  await expect(page.locator("main").getByRole("alert")).toContainText("Choose a PDF");
  await input.setInputFiles({ name: "floor-plan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await expect(page.getByText("floor-plan.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove floor-plan.pdf", exact: true }).click();
  await expect(page.getByText("floor-plan.pdf removed. Undo is available until you leave this section.")).toBeVisible();

  // A status change and an inspection check should survive a reload
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  const status = page.locator(".status-select").first();
  await status.selectOption("submitted");
  await expect(status).toHaveValue("submitted");
  await page.reload();
  await expect(page.locator(".status-select").first()).toHaveValue("submitted");
  await page.getByRole("tab", { name: "Inspections", exact: true }).click();
  const check = page.getByRole("checkbox").first();
  await check.check();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});

// A long name on a small phone should still save as one project
test("phone intake preserves draft and builds exactly one project", async ({ page }, testInfo) => {
  // Short phone. A long name should still fit, and Enter should save once.
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
  await page.goto("/intake");
  await page.getByRole("button", { name: /^Home bakery/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How big is the space?" })).toBeFocused();
  await page.getByLabel("About how many square feet?").fill("580");
  await fitsPage(page);
  await page.screenshot({ path: testInfo.outputPath("intake-size.png"), fullPage: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // A long name should stay inside the phone width
  await page.getByLabel("Project name", { exact: true }).fill("A very long neighborhood bakery project name " + "Bakery".repeat(20));
  await fitsPage(page);
  await page.screenshot({ path: testInfo.outputPath("intake-name.png"), fullPage: true });
  // Enter on the name field submits and should create one project
  await page.getByLabel("Project name", { exact: true }).press("Enter");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A very long neighborhood bakery");
  await fitsPage(page);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("long-project.png"), fullPage: true });
});

// Reduced motion, high contrast, and the language menu stay keyboard friendly
test("high contrast and reduced motion keep keyboard controls usable", async ({ page }) => {
  // Pretend the user prefers less motion
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  // The guide opens from the query. Escape should close it.
  await page.goto("/demo?tour=1");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // High contrast adds a class on the page root
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "High contrast", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  // Arrow moves in the language list. Escape returns focus to the button.
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await expect(page.getByRole("option", { name: /English/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Change language", exact: true })).toBeFocused();
  await fitsPage(page);
});

// Changing tabs closes the guide. Citation details work by click and keyboard.
test("guide respects navigation and citation details work by touch and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  // Opening another tab should dismiss the guide
  await page.goto("/demo?tour=1");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
  // The citation popover has to stay inside the phone width
  const citation = page.getByRole("button", { name: /Show citation details/ }).first();
  await citation.click();
  const details = page.getByRole("region", { name: /citation details/ });
  await expect(details).toBeVisible();
  const bounds = await details.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await details.getByRole("button", { name: "Close", exact: true }).click();
  await expect(citation).toBeFocused();
  // Enter opens the details again. Escape closes them and restores focus.
  await citation.press("Enter");
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(citation).toBeFocused();
});

// Offline navigation shows the recovery page, and private URLs stay out of the cache
test("installed web app serves offline recovery without caching private pages", async ({ page, context }) => {
  // This worker is only registered on the production build
  test.skip(!process.env.PLAYWRIGHT_PRODUCTION, "Worker registration is production-only");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Wait until the service worker is controlling the page
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  // The cache should have the offline page and nothing private
  const cachedPaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (await Promise.all(keys.map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)))).flat();
  });
  expect(cachedPaths).toContain("/offline.html");
  expect(cachedPaths.some((path) => path.startsWith("/projects") || path.startsWith("/api") || path === "/login")).toBe(false);
  // Offline, a project URL should show the recovery page
  await context.setOffline(true);
  await page.goto("/projects/offline-test");
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await fitsPage(page);
  // Back online, a missing project is a normal not-found page
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Project not found" })).toBeVisible();
});
