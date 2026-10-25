import { expect, test, type Page } from "@playwright/test";

// These tests tap the page the way a phone does
test.use({ hasTouch: true, isMobile: true });

// Open Harbor Kitchen on a tab, with the guide already dismissed
async function openProject(page: Page, tab = "overview") {
  await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
  await page.goto(`/demo?tab=${tab}`);
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Harbor Kitchen", exact: true })).toBeVisible();
}

// Two phone widths. The short one is 320, the taller one is 430.
for (const width of [320, 430]) {
  // Tabs, a waiting step, fees, and a checklist check on a phone
  test(`phone sections and permit dependencies remain reachable at ${width}px`, async ({ page }) => {
    // Shorter screen at 320, taller screen at 430
    await page.setViewportSize({ width, height: width === 320 ? 740 : 932 });
    await openProject(page);
    const sections = page.getByRole("tablist");
    // All sections fit together; the phone does not need a sideways swipe.
    for (const tab of await sections.getByRole("tab").all()) {
      const box = await tab.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    // Jump to the business license and check that it is still waiting
    await page.getByRole("tab", { name: "Timeline", exact: true }).tap();
    const jump = page.getByRole("combobox", { name: "Jump to a permit step", exact: true });
    await jump.selectOption("business-license");
    const target = page.locator("#step-business-license");
    await expect(target).toBeFocused();
    await expect(target.getByText("Waiting on earlier approvals", { exact: true })).toBeVisible();
    // The section bar sits at the top, and the step starts below it
    const navBox = await sections.boundingBox();
    const targetBox = await target.boundingBox();
    expect(navBox!.y).toBe(0);
    expect(targetBox!.y).toBeGreaterThanOrEqual(navBox!.height);
    await target.getByRole("button", { name: "View prerequisite: Health permit", exact: true }).tap();
    await expect(page.locator("#step-health-permit")).toBeFocused();
    await expect(page.locator("#step-health-permit")).toContainText("Recorded as in review");
    // Switching from deep content starts the selected section below the nav.
    await page.getByRole("tab", { name: "Fees", exact: true }).tap();
    await expect(page.getByRole("heading", { name: "Itemized municipal costs" })).toBeInViewport();
    await expect(page.getByText("Estimated total", { exact: true })).toBeInViewport();
    await page.getByRole("tab", { name: "Inspections", exact: true }).tap();
    // Continue checklist focuses the first box and leaves it unchecked
    const check = page.getByRole("checkbox").first();
    await page.getByRole("button", { name: /^Continue checklist/ }).tap();
    await expect(check).toBeFocused();
    await expect(check).not.toBeChecked();
    // The bar sticks while the screen is tall
    await expect(sections).toHaveCSS("position", "sticky");
    // A checked item should still be checked after reload
    await check.check();
    await page.reload();
    await expect(page.getByRole("checkbox").first()).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // A short screen drops the bar back into normal flow
    await page.setViewportSize({ width, height: 460 });
    await expect(sections).toHaveCSS("position", "static");
  });
}

// A full disk on the first save, then undo brings the file back
test("phone attachment save failure retries the selected file and removal can be undone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProject(page, "documents");
  const section = page.locator("#documents-electrical-permit");
  // The first project write throws. The retry is allowed through.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    // Fail the first project save, then call the real setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("permitpilot:project:") && !failed) { failed = true; throw new DOMException("Test storage full", "QuotaExceededError"); }
      return original.call(this, key, value);
    };
  });
  // A long file name should still save, and undo should put it back
  const name = `electrical-plan-${"long-name-".repeat(15)}.pdf`;
  await section.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await expect(section.getByRole("alert")).toContainText("Retry attachment");
  const retry = section.getByRole("button", { name: /^Retry attachment/ });
  await expect(retry).toBeFocused();
  await retry.tap();
  await expect(section.getByText(name, { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: /^Replace file/ })).toBeFocused();
  await section.getByRole("button", { name: `Remove ${name}`, exact: true }).tap();
  await expect(section.getByText(name, { exact: true })).toBeHidden();
  await section.getByRole("button", { name: `Undo removal of ${name}`, exact: true }).tap();
  await expect(section.getByText(name, { exact: true })).toBeVisible();
  // After reload the file is still stored as a PDF data URL
  await page.reload();
  await expect(section.getByText(name, { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("permitpilot:project:sample-harbor-kitchen")!).documents.find((doc: { name: string }) => doc.name.startsWith("electrical-plan-")));
  expect(saved.dataUrl).toMatch(/^data:application\/pdf;base64,/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// Install help opens inside the menu, and Escape walks focus back out
test("phone install help stays in the menu and Escape restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  // Install help lives inside the open menu
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.tap();
  const install = page.locator(".pwa-controls > summary");
  await install.tap();
  await expect(page.locator(".pwa-help")).toBeVisible();
  await expect(page.getByText(/Installation does not sync projects/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Escape closes the help and leaves the menu open
  await install.focus();
  await page.keyboard.press("Escape");
  await expect(install).toBeFocused();
  await expect(page.locator(".pwa-help")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  // A second Escape closes the menu and returns focus to its button
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
});

// If storage throws, the page offers a retry once reads work again
test("phone project loading recovers when browser storage becomes available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProject(page);
  // After reload, project reads throw until we put getItem back
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    // Project reads throw until we put the original getItem back
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("permitpilot:project")) throw new DOMException("Test storage denied", "SecurityError");
      return original.call(this, key);
    };
    // The test calls this to turn project reads back on
    Reflect.set(window, "restoreProjectStorage", () => { Storage.prototype.getItem = original; });
  });
  // The page should ask for storage access
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("allow browser storage");
  await expect(page.getByRole("heading", { name: "Project not found", exact: true })).toBeHidden();
  // Put storage back and try the load again
  await page.evaluate(() => Reflect.get(window, "restoreProjectStorage")());
  await page.getByRole("button", { name: "Try again", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Harbor Kitchen", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
});

// The saved project row is easy to tap and opens the roadmap
test("a saved project opens status and the next action from a comfortable phone target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProject(page);
  // The project link should be a big tap target and open the roadmap
  await page.getByRole("link", { name: "All projects", exact: true }).tap();
  const project = page.getByRole("link", { name: "Harbor Kitchen", exact: true });
  await expect(project).toHaveAttribute("href", "/projects/sample-harbor-kitchen?tab=overview");
  expect((await project.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await project.tap();
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("progressbar", { name: "Steps marked approved" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("button", { name: "Review Health permit", exact: true })).toBeInViewport();
});
