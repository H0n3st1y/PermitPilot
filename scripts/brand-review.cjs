const { chromium } = require('../apps/web/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = path.resolve(__dirname, '../docs/brand-refresh');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const checks = [];
  for (const [label, width, height] of [['narrow', 320, 740], ['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('permitpilot:tour_v1', 'done'));
    await page.goto('http://127.0.0.1:3000/');
    await page.getByRole('heading', { name: 'Less permit confusion. More progress.', exact: true }).waitFor();
    await page.screenshot({ path: path.join(out, `after-${label}.png`), fullPage: true });
    await page.screenshot({ path: path.join(out, `after-${label}-viewport.png`) });
    checks.push({ label, width, height, errors, fits: await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), font: await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily) });
    if (label === 'phone' || label === 'desktop') {
      for (const route of ['/intake', '/login', '/about']) {
        await page.goto(`http://127.0.0.1:3000${route}`);
        await page.locator('main').waitFor();
        await page.screenshot({ path: path.join(out, `after-${label}-${route.slice(1)}.png`), fullPage: true });
      }
      await page.goto('http://127.0.0.1:3000/demo?tab=overview');
      await page.waitForURL('**/projects/**');
      await page.getByRole('heading', { name: 'Harbor Kitchen', exact: true }).waitFor();
      for (const tab of ['Roadmap', 'Timeline', 'Documents', 'Fees', 'Inspections', 'Graph']) {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        if (tab === 'Graph') await page.locator('#graph-step-picker').waitFor();
        await page.screenshot({ path: path.join(out, `after-${label}-${tab.toLowerCase()}.png`), fullPage: true });
      }
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  const cdp = await context.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  const eligibility = await cdp.send('Page.getInstallabilityErrors');
  const worker = await page.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, standalone: matchMedia('(display-mode: standalone)').matches, caches: await caches.keys(), paths: (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat() }));
  const result = { checkedAt: new Date().toISOString(), environment: 'Production standalone server, isolated Chromium viewport/touch emulation; not a physical installed device', checks, pwa: { manifestErrors: manifest.errors, installabilityErrors: eligibility.installabilityErrors, ...worker } };
  fs.writeFileSync(path.join(out, 'browser-evidence.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
