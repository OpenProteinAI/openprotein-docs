import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5002';
const paths = process.argv.slice(2);
const targets = paths.length ? paths : ['/getting-started', '/', '/web-app'];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

for (const path of targets) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const rows = await page.evaluate(() => {
    const box = (label, sel) => {
      const el = [...document.querySelectorAll(sel)].find(
        (n) => n.getBoundingClientRect().width > 4,
      );
      if (!el) return { label, missing: true };
      const r = el.getBoundingClientRect();
      return {
        label,
        x: Math.round(r.x),
        right: Math.round(r.right),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    return [
      box('header', '#nd-subnav'),
      box('header logo', '#nd-subnav a'),
      box('header nav 1st', '#nd-subnav nav a'),
      box('sidebar rail', '#nd-sidebar'),
      box('sidebar banner', '#nd-sidebar [data-header-body], #nd-sidebar > div:first-child'),
      box('sidebar nav 1st', '#nd-sidebar a'),
      box('article', 'article'),
      box('h1', 'article h1'),
      box('toc', '#nd-toc'),
      box('main h1', 'main h1'),
      box('header inner', '#nd-subnav [data-header-body]'),
    ];
  });

  console.log(`\n${path}`);
  for (const r of rows) {
    console.log(
      r.missing
        ? `  ${r.label.padEnd(17)} MISSING`
        : `  ${r.label.padEnd(17)} x=${String(r.x).padStart(5)} right=${String(r.right).padStart(5)} w=${String(r.w).padStart(5)} h=${r.h}`,
    );
  }

  const find = (l) => rows.find((r) => r.label === l);
  const has = (r) => r && !r.missing;
  const logo = find('header logo');
  const inner = find('header inner');
  const rail = find('sidebar rail');
  const sideLink = find('sidebar nav 1st');
  const toc = find('toc');
  const main = find('article') ?? find('main h1');
  const content = has(find('article')) ? find('article') : find('main h1');

  const checks = [];

  if (has(inner)) checks.push([`header inner width ${inner.w} == 1520`, inner.w === 1520]);

  if (has(logo) && has(inner))
    checks.push([`logo x (${logo.x}) == header inner x + 16 (${inner.x + 16})`, logo.x === inner.x + 16]);

  if (has(logo) && has(sideLink))
    checks.push([`logo x (${logo.x}) == sidebar link x (${sideLink.x})`, Math.abs(logo.x - sideLink.x) <= 2]);

  // Must occupy the page column, not the gutter.
  if (has(rail) && has(content)) {
    checks.push([`content x (${content.x}) >= sidebar rail right (${rail.right})`, content.x >= rail.right - 2]);
    checks.push([`content width (${content.w}) > 600 (not collapsed into the gutter)`, content.w > 600]);
  }

  const rightEdge = has(toc) ? toc : inner;
  if (has(inner) && has(rightEdge))
    checks.push([
      `header inner right (${inner.right}) == shell right (${rightEdge.right})`,
      Math.abs(inner.right - rightEdge.right) <= 2,
    ]);

  for (const [label, pass] of checks) console.log(`  ${pass ? "ok  " : "FAIL"} ${label}`);
}

await browser.close();
