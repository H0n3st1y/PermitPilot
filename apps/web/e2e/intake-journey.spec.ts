import { expect, test, type Page } from "@playwright/test";

// Open intake, pick a project card, and land on the size step
async function chooseProject(page: Page, type = "Home bakery") {
  await page.goto("/intake");
  // Continue is already enabled on a fresh form
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: new RegExp(`^${type}`) }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Focus should land on the size question
  await expect(page.getByRole("heading", { name: "How big is the space?" })).toBeFocused();
}

// Same journey on a phone width and a desktop width
for (const width of [390, 1440]) {
  // Answers should survive bad input, edits, and a save-and-resume
  test(`intake preserves answers through validation, editing and resume at ${width}px`, async ({ page }) => {
    // Phone height at 390, a regular desktop height otherwise
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/intake");
    // Continue with nothing picked should focus the error
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("form").getByRole("alert")).toBeFocused();
    await expect(page.locator("#use-case-choices")).toHaveAttribute("aria-describedby", "useCase-error");
    // The error link sends focus back to the cards
    await page.locator('a[href="#use-case-choices"]').click();
    await expect(page.locator("#use-case-choices")).toBeFocused();
    await page.getByRole("button", { name: /^Home bakery/ }).click();
    await page.getByLabel("Which state are you in?").selectOption("CA");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Zero square feet and a blank cost should both fail
    await page.getByLabel("About how many square feet?").fill("0");
    await page.getByLabel("Rough cost of the work (USD)").fill("");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#sqft")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#valuation")).toHaveAttribute("aria-invalid", "true");
    // Put in real numbers and add mechanical work
    await page.locator("#sqft").fill("580");
    await expect(page.locator("#sqft")).toBeFocused();
    await page.locator("#valuation").fill("12500");
    await page.getByRole("checkbox", { name: "Mechanical / HVAC", exact: true }).check();
    // Going back should keep the bakery card and California
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Home bakery/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#state")).toHaveValue("CA");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Size, cost, and the trade box should still be filled in
    await expect(page.locator("#sqft")).toHaveValue("580");
    await expect(page.locator("#valuation")).toHaveValue("12500");
    await expect(page.getByRole("checkbox", { name: "Mechanical / HVAC", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Name the project and pick a start date
    await page.getByLabel("Project name", { exact: true }).fill("Maya’s Home Bakery");
    await page.getByLabel("Desired start date (optional)").fill("2027-01-04");
    // Jump back to the size step, then return to review
    await page.getByRole("button", { name: "Edit space and work", exact: true }).click();
    await expect(page.locator("#sqft")).toHaveValue("580");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#name")).toHaveValue("Maya’s Home Bakery");
    await expect(page.locator("#start")).toHaveValue("2027-01-04");
    await expect(page.getByRole("region", { name: "Your answers" })).toContainText("California");
    // Leave and come back. The draft should still be on review.
    await page.getByRole("button", { name: "Save & exit", exact: true }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/intake");
    await expect(page.getByRole("heading", { name: "Review and name your project" })).toBeVisible();
    await expect(page.locator("#name")).toHaveValue("Maya’s Home Bakery");
    await expect(page.locator("#start")).toHaveValue("2027-01-04");
    // Building the checklist opens the new project
    await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
    await page.waitForURL("**/projects/**");
    await expect(page).toHaveURL(/tab=overview&created=1/);
    await expect(page.getByRole("heading", { name: "Your roadmap is ready", exact: true })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Prepare Zoning review", exact: true })).toBeVisible();
    await expect(page.getByText("This step does not depend on earlier approvals.", { exact: false })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
    // One saved project, and the intake draft is cleared
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("permitpilot:draft"))).toBeNull();
    // Open dependencies, then dismiss the new-roadmap note
    await page.getByRole("button", { name: "View dependencies", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toBeFocused();
    await expect(page.getByRole("button", { name: "View prerequisite: Zoning review", exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Prepare Zoning review", exact: true })).toBeFocused();
    await expect(page).not.toHaveURL(/created=1/);
    // Open the zoning step, then jump to its missing documents
    await page.getByRole("button", { name: "Review Zoning review", exact: true }).click();
    await expect(page.locator("#step-zoning-review")).toBeFocused();
    await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
    await page.getByRole("button", { name: /^Review \d+ missing required attachments$/ }).click();
    await expect(page.locator("#documents-zoning-review")).toBeFocused();
    // The page should fit the viewport width
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

// Attendance shows up for a public event, and a negative count is rejected
test("phone event fields appear only when relevant and retain entered attendance", async ({ page }) => {
  // Narrow phone. Attendance should show only when the public is coming.
  await page.setViewportSize({ width: 320, height: 740 });
  await chooseProject(page, "Neighborhood event");
  // Skip the size step and name the event
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Harbor Block Party");
  const attendance = page.getByLabel("Expected attendance", { exact: true });
  await attendance.fill("250");
  const publicAttendance = page.getByRole("checkbox", { name: "The public will attend", exact: true });
  // Turning public attendance off hides the count
  await publicAttendance.uncheck();
  await expect(attendance).toBeHidden();
  // Turning it back on should restore 250
  await publicAttendance.check();
  await expect(attendance).toHaveValue("250");
  // A negative count should fail validation
  await attendance.fill("-1");
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await expect(attendance).toHaveAttribute("aria-invalid", "true");
  await attendance.fill("250");
  // Back and forward should keep the fixed count
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(attendance).toHaveValue("250");
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Harbor Block Party", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// A quota error on the first save should leave the form ready for one retry
test("a failed project save preserves answers and can retry without a duplicate", async ({ page }) => {
  // Phone width. The first save fails, and the retry should make one project.
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProject(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Recovery Bakery");
  // First project write throws a quota error. Later writes go through.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    // Fail the first project save, then call the real setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("permitpilot:project:") && !failed) { failed = true; throw new DOMException("Test quota", "QuotaExceededError"); }
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  // The name should still be on the form after the failed save
  await expect(page.locator("form").getByRole("alert")).toContainText("Your answers are still here");
  await expect(page.locator("#name")).toHaveValue("Recovery Bakery");
  // The second try creates the project
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await page.waitForURL("**/projects/**");
  await expect(page.getByRole("heading", { name: "Recovery Bakery", exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("permitpilot:project:")).length)).toBe(1);
});

// A short screen should keep the focused cost field on screen
test("focused phone inputs remain usable in a reduced-height viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseProject(page);
  // Shrink the height the way a phone keyboard does
  await page.setViewportSize({ width: 390, height: 460 });
  const input = page.locator("#valuation");
  await input.focus();
  await input.scrollIntoViewIfNeeded();
  await input.fill("8500");
  // The action bar stays in normal flow so the field can sit on screen
  await expect(page.locator(".intake-actions")).toHaveCSS("position", "static");
  // The cost field should be fully inside the short viewport
  const box = await input.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(460);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
