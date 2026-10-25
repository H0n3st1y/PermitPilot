import { expect, test, type Page } from "@playwright/test";

async function chooseProject(page: Page, type = "Home bakery") {
  await page.goto("/intake");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: new RegExp(`^${type}`) }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How big is the space?" })).toBeFocused();
}

for (const width of [390, 1440]) {
  test(`intake preserves answers through validation, editing and resume at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/intake");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("form").getByRole("alert")).toBeFocused();
    await expect(page.locator("#use-case-choices")).toHaveAttribute("aria-describedby", "useCase-error");
    await page.locator('a[href="#use-case-choices"]').click();
    await expect(page.locator("#use-case-choices")).toBeFocused();
    await page.getByRole("button", { name: /^Home bakery/ }).click();
    await page.getByLabel("Which state are you in?").selectOption("CA");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("About how many square feet?").fill("0");
    await page.getByLabel("Rough cost of the work (USD)").fill("");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#sqft")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#valuation")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#sqft").fill("580");
    await expect(page.locator("#sqft")).toBeFocused();
    await page.locator("#valuation").fill("12500");
    await page.getByRole("checkbox", { name: "Mechanical / HVAC", exact: true }).check();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Home bakery/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#state")).toHaveValue("CA");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#sqft")).toHaveValue("580");
    await expect(page.locator("#valuation")).toHaveValue("12500");
    await expect(page.getByRole("checkbox", { name: "Mechanical / HVAC", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Project name", { exact: true }).fill("Maya’s Home Bakery");
    await page.getByLabel("Desired start date (optional)").fill("2027-01-04");
    await page.getByRole("button", { name: "Edit space and work", exact: true }).click();
    await expect(page.locator("#sqft")).toHaveValue("580");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#name")).toHaveValue("Maya’s Home Bakery");
    await expect(page.locator("#start")).toHaveValue("2027-01-04");
    await expect(page.getByRole("region", { name: "Your answers" })).toContainText("California");
    await page.getByRole("button", { name: "Save & exit", exact: true }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/intake");
    await expect(page.getByRole("heading", { name: "Review and name your project" })).toBeVisible();
    await expect(page.locator("#name")).toHaveValue("Maya’s Home Bakery");
    await expect(page.locator("#start")).toHaveValue("2027-01-04");
    await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
    await page.waitForURL("**/projects/**");
    await expect(page).toHaveURL(/tab=overview&created=1/);
    await expect(page.getByRole("heading", { name: "Your roadmap is ready", exact: true })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Prepare Zoning review", exact: true })).toBeVisible();
    await expect(page.getByText("This step does not depend on earlier approvals.", { exact: false })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("permitpilot:draft"))).toBeNull();
    await page.getByRole("button", { name: "View dependencies", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toBeFocused();
    await expect(page.getByRole("button", { name: "View prerequisite: Zoning review", exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Prepare Zoning review", exact: true })).toBeFocused();
    await expect(page).not.toHaveURL(/created=1/);
    await page.getByRole("button", { name: "Review Zoning review", exact: true }).click();
    await expect(page.locator("#step-zoning-review")).toBeFocused();
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await page.getByRole("button", { name: /^Review \d+ missing required attachments$/ }).click();
    await expect(page.locator("#documents-zoning-review")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("phone event fields appear only when relevant and retain entered attendance", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await chooseProject(page, "Neighborhood event");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Harbor Block Party");
  const attendance = page.getByLabel("Expected attendance", { exact: true });
  await attendance.fill("250");
  const publicAttendance = page.getByRole("checkbox", { name: "The public will attend", exact: true });
  await publicAttendance.uncheck();
  await expect(attendance).toBeHidden();
  await publicAttendance.check();
  await expect(attendance).toHaveValue("250");
  await attendance.fill("-1");
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await expect(attendance).toHaveAttribute("aria-invalid", "true");
  await attendance.fill("250");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(attendance).toHaveValue("250");
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Harbor Block Party", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a failed project save preserves answers and can retry without a duplicate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProject(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Recovery Bakery");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("permitpilot:project:") && !failed) { failed = true; throw new DOMException("Test quota", "QuotaExceededError"); }
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Your answers are still here");
  await expect(page.locator("#name")).toHaveValue("Recovery Bakery");
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Recovery Bakery", exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
});

test("focused phone inputs remain usable in a reduced-height viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProject(page);
  await page.setViewportSize({ width: 390, height: 460 });
  const input = page.locator("#valuation");
  await input.focus();
  await input.scrollIntoViewIfNeeded();
  await input.fill("8500");
  await expect(page.locator(".intake-actions")).toHaveCSS("position", "static");
  const box = await input.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(460);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
