import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const OUT = process.env.OUT ?? '/tmp/opshots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch(
  // CI has no system Chrome; PLAYWRIGHT_CHANNEL=chromium uses Playwright's own build.
  process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);

const shots = [
  { name: 'docs', path: '/getting-started', h: 900 },
  { name: 'home', path: '/', h: 700 },
  { name: '404', path: '/web-app', h: 700 },
  { name: 'docs-mobile', path: '/getting-started', h: 700, w: 430 },
];

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const s of shots) {
    await page.setViewportSize({ width: s.w ?? 1600, height: s.h });
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png` });
  }
  await ctx.close();
}

await browser.close();
console.log(`wrote ${shots.length * 2} screenshots to ${OUT}`);
