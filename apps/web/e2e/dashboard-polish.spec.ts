import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`dashboard priorities lead to the right work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
    await page.goto("/demo?tab=overview");
    await page.waitForURL("**/projects/**");
    await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Harbor Kitchen");
    if (width === 390) {
      const action = await page.getByRole("button", { name: "Review Health permit", exact: true }).boundingBox();
      expect(action!.y + action!.height).toBeLessThanOrEqual(844);
    }
    await expect(page.getByRole("progressbar", { name: "Steps marked approved" })).toHaveAttribute("aria-valuenow", "1");
    await expect(page.getByRole("button", { name: "Review 6 missing required attachments" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review blocked steps" })).toContainText("1 blocked step");
    await expect(page.getByRole("button", { name: "View estimated project timeline" })).toContainText("not a deadline");

    await page.getByRole("button", { name: "Review Health permit", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#step-health-permit")).toBeFocused();
    await page.locator("#step-health-permit").getByRole("combobox").selectOption("approved");
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    await expect(page.getByRole("button", { name: "Review Electrical", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Review 6 missing required attachments" }).click();
    await expect(page.locator("#documents-electrical-permit")).toBeFocused();
    await page.locator("#documents-electrical-permit").getByRole("button", { name: /^Attach sample PDF/ }).click();
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await expect(page.getByRole("button", { name: "Review 5 missing required attachments" })).toBeVisible();
    await page.getByRole("button", { name: "Review blocked steps" }).click();
    await expect(page.locator("#step-business-license")).toBeFocused();

    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    const details = page.locator("details.project-details");
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByText("Residential district", { exact: true })).toBeVisible();
    await expect(details.getByText("Planning notes", { exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(details).not.toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("long and completed project states remain usable on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("permitpilot:tour_v1", "done"));
  await page.goto("/demo");
  await page.waitForURL("**/projects/**");
  await page.evaluate(() => {
    const key = "permitpilot:project:sample-harbor-kitchen";
    const project = JSON.parse(localStorage.getItem(key)!);
    project.config.name = "Neighborhood bakery and community kitchen " + "LongProjectName".repeat(12);
    project.roadmap.steps.forEach((step: { status: string }) => { step.status = "approved"; });
    localStorage.setItem(key, JSON.stringify(project));
  });
  await page.reload();
  await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
  await expect(page.getByText("All steps marked approved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review 6 missing required attachments" })).toBeVisible();
  await expect(page.getByText("No dependency blockers", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("explicit overview entry stays on the dashboard and the guide remains available", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install();
  await page.goto("/demo?tab=overview");
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Check on Health permit", exact: true })).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Graph", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
