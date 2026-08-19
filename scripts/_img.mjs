import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto('http://localhost:5001/walkthroughs/quantitative-decision-making-library-design', { waitUntil: 'networkidle' });
// force every lazy image to load
await p.evaluate(async () => {
  const imgs = [...document.querySelectorAll('article img')];
  imgs.forEach((i) => { i.loading = 'eager'; });
  await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
});
await p.waitForTimeout(600);
const rows = await p.evaluate(() =>
  [...document.querySelectorAll('article img[src^="data:image/png"]')].map((i) => {
    const r = i.getBoundingClientRect();
    return { nat: `${i.naturalWidth}x${i.naturalHeight}`, ren: `${Math.round(r.width)}x${Math.round(r.height)}`,
             stretched: r.width > i.naturalWidth + 1 };
  }));
console.log(rows);
console.log('content column width:', await p.evaluate(() => Math.round(document.querySelector('article').getBoundingClientRect().width)));
await b.close();
