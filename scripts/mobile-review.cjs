const { chromium } = require('../apps/web/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
(async () => {
  const phase = process.argv[2] || 'after';
  const out = path.resolve(__dirname, '../docs/mobile-refinement');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const [label, width, height] of [['phone', 390, 844], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: label === 'phone', hasTouch: label === 'phone' });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('permitpilot:tour_v1', 'done'));
    await page.goto('http://127.0.0.1:3000/demo?tab=overview');
    await page.waitForURL('**/projects/**');
    await page.getByRole('heading', { name: 'Harbor Kitchen', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${phase}-${label}-overview.png`), fullPage: true });
    await page.screenshot({ path: path.join(out, `${phase}-${label}-overview-viewport.png`) });
    for (const name of ['Timeline', 'Documents', 'Fees', 'Inspections']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await page.getByRole('tabpanel').waitFor();
      await page.screenshot({ path: path.join(out, `${phase}-${label}-${name.toLowerCase()}-full.png`), fullPage: true });
      await page.getByRole('tabpanel').evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(out, `${phase}-${label}-${name.toLowerCase()}.png`) });
    }
    await context.close();
  }
  await browser.close();
  console.log(`${phase} captures saved in ${out}`);
})().catch(error => { console.error(error); process.exit(1); });
