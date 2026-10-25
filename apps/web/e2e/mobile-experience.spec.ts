import { expect, test, type Page } from "@playwright/test";

async function fitsPage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const [width, height] of [[320, 740], [430, 932], [768, 1024], [1440, 900]]) {
  test(`main screens fit ${width} × ${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["/", "/login", "/intake", "/about", "/projects/missing-project"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      if (route.includes("missing-project")) await expect(page.getByRole("heading", { name: "Project not found" })).toBeVisible();
      await fitsPage(page);
      await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "_") || "home"}.png`), fullPage: true });
    }
    await page.goto("/demo");
    await page.waitForURL("**/projects/**");
    await expect(page.getByRole("heading", { name: "Harbor Kitchen", exact: true })).toBeVisible();
    for (const name of ["Roadmap", "Graph", "Timeline", "Documents", "Fees", "Inspections"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toBeVisible();
      await expect(page.getByRole("tabpanel")).toHaveAttribute("id", `panel-${name === "Roadmap" ? "overview" : name.toLowerCase()}`);
      if (name === "Graph") await expect(page.locator("#graph-step-picker")).toBeVisible();
      await fitsPage(page);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test("phone navigation, keyboard tabs, document recovery and persistent progress", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "New project", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();

  await page.goto("/demo");
  await page.waitForURL("**/projects/**");
  await page.getByRole("tab", { name: "Graph", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Inspections", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toBeFocused();
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("bad") });
  await expect(page.locator("main").getByRole("alert")).toContainText("Choose a PDF");
  await input.setInputFiles({ name: "floor-plan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await expect(page.getByText("floor-plan.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove floor-plan.pdf", exact: true }).click();
  await expect(page.getByText("floor-plan.pdf removed. Undo is available until you leave this section.")).toBeVisible();

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

test("phone intake preserves draft and builds exactly one project", async ({ page }, testInfo) => {
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
  await page.getByLabel("Project name", { exact: true }).fill("A very long neighborhood bakery project name " + "Bakery".repeat(20));
  await fitsPage(page);
  await page.screenshot({ path: testInfo.outputPath("intake-name.png"), fullPage: true });
  await page.getByLabel("Project name", { exact: true }).press("Enter");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A very long neighborhood bakery");
  await fitsPage(page);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("long-project.png"), fullPage: true });
});

test("high contrast and reduced motion keep keyboard controls usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo?tour=1");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "High contrast", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await expect(page.getByRole("option", { name: /English/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Change language", exact: true })).toBeFocused();
  await fitsPage(page);
});

test("guide respects navigation and citation details work by touch and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/demo?tour=1");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
  const citation = page.getByRole("button", { name: /Show citation details/ }).first();
  await citation.click();
  const details = page.getByRole("region", { name: /citation details/ });
  await expect(details).toBeVisible();
  const bounds = await details.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await details.getByRole("button", { name: "Close", exact: true }).click();
  await expect(citation).toBeFocused();
  await citation.press("Enter");
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(citation).toBeFocused();
});

test("installed web app serves offline recovery without caching private pages", async ({ page, context }) => {
  test.skip(!process.env.PLAYWRIGHT_PRODUCTION, "Worker registration is production-only");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  const cachedPaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (await Promise.all(keys.map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)))).flat();
  });
  expect(cachedPaths).toContain("/offline.html");
  expect(cachedPaths.some((path) => path.startsWith("/projects") || path.startsWith("/api") || path === "/login")).toBe(false);
  await context.setOffline(true);
  await page.goto("/projects/offline-test");
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await fitsPage(page);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Project not found" })).toBeVisible();
});
