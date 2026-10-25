import { expect, test } from "@playwright/test";

test("landing offers clear project and sample entry without an inline password form", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Less permit confusion. More progress.");
  await expect(page.locator('main input[type="password"]')).toHaveCount(0);
  await page.locator(".landing-hero").getByRole("link", { name: "Plan my project", exact: true }).click();
  await expect(page).toHaveURL("/intake");
  await expect(page.getByRole("heading", { name: "What are you planning?", exact: true })).toBeVisible();
  await page.locator("header").getByRole("link", { name: "PermitPilot home", exact: true }).click();
  await page.getByRole("link", { name: "Explore a sample", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^?]+\?tab=overview$/);
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Harbor Kitchen", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip guide", exact: true })).toHaveCount(0);
});

test("benefit links open the actual document checklist and calculated fees", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "See the document checklist", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Documents", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /^Upload file for/ }).first()).toBeVisible();
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await page.getByRole("link", { name: "Explore costs and preparation", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Fees", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Estimated total", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Itemized municipal costs", exact: true })).toBeVisible();
});

test("brand assets are available and headings use the same system font as the body", async ({ page, request }) => {
  const fontRequests: string[] = [];
  page.on("request", (sent) => { if (/\.woff2?(?:\?|$)/i.test(sent.url())) fontRequests.push(sent.url()); });
  await page.goto("/");
  const home = page.locator("header").getByRole("link", { name: "PermitPilot home", exact: true });
  await expect(home).toHaveAttribute("href", "/");
  await expect(home.locator("svg")).toBeVisible();
  const fonts = await page.evaluate(() => ({ body: getComputedStyle(document.body).fontFamily, heading: getComputedStyle(document.querySelector("h1")!).fontFamily }));
  expect(fonts.heading).toBe(fonts.body);
  expect(fonts.body).toContain("-apple-system");
  expect(fontRequests).toEqual([]);
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("PermitPilot");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);
  const icon = await request.get("/icon.svg");
  expect(await icon.text()).toContain("PermitPilot");
  expect(await icon.text()).toContain('fill="#ad4f20"');
});

test("an anonymous phone project remains accessible from the landing workspace", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/intake");
  await page.getByRole("button", { name: /^Home bakery/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const name = "Cedar Street Bakery";
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Build my checklist", exact: true }).click();
  await expect(page).toHaveURL(/tab=overview&created=1/);
  expect(await page.evaluate(() => localStorage.getItem("permitpilot:auth:user"))).toBeNull();
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your projects", exact: true })).toBeVisible();
  const savedProject = page.getByRole("link", { name, exact: true });
  await expect(savedProject).toHaveAttribute("href", /\?tab=overview$/);
  expect((await savedProject.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await savedProject.click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Roadmap", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("Spanish and Arabic landing copy fits a narrow phone with correct reading direction", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  for (const [locale, direction, title, start] of [
    ["es", "ltr", "Menos confusión con los permisos. Más avances.", "Planificar mi proyecto"],
    ["ar", "rtl", "ارتباك أقل في التصاريح. تقدّم أكثر.", "خطّط لمشروعي"],
  ]) {
    await page.locator(".nav-menu-toggle").click();
    await page.getByRole("button", { expanded: false }).and(page.locator('[aria-haspopup="listbox"]')).click();
    await page.getByRole("option").and(page.locator(`[lang="${locale}"]`)).click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    // Verify the visible preference also persists across a fresh page load.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", direction);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".landing-hero").getByRole("link", { name: start, exact: true })).toBeVisible();
    await expect(page.locator(".preview-progress strong")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(".preview-progress strong")).toHaveText("1 / 6");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("an unconfigured production login disables password accounts while retaining sample access", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_PRODUCTION, "The account guard is specific to the production build.");
  test.skip(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "Live configured authentication needs its own service acceptance checks.");
  await page.goto("/login");
  await expect(page.locator("#account-availability")).toContainText("Account sign-in is not available on this installation yet");
  await expect(page.getByLabel("Email address", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "See All 3 Sample Projects", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Harbor Kitchen", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("permitpilot:auth:accounts"))).toBeNull();
});
