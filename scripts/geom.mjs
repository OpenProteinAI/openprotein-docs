import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const paths = process.argv.slice(2);
const targets = paths.length ? paths : ['/getting-started', '/', '/web-app'];

const browser = await chromium.launch(
  // CI has no system Chrome; PLAYWRIGHT_CHANNEL=chromium uses Playwright's own build.
  process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
let failures = 0;

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
      box('sidebar group', '#nd-sidebar [data-radix-scroll-area-viewport] > div > div > button'),
      box('sidebar nav 1st', '#nd-sidebar a'),
      box('article', 'article'),
      box('h1', 'article h1'),
      box('toc', '#nd-toc'),
      box('main h1', 'main h1'),
      box('header inner', '#nd-subnav [data-header-body]'),
      box('footer logo', 'footer img'),
      box('footer cols', 'footer > div > div:last-child'),
      box('header actions', '#nd-subnav [data-header-body] > div:last-child'),
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
  const sideGroup = find('sidebar group');
  const toc = find('toc');
  const main = find('article') ?? find('main h1');
  const content = has(find('article')) ? find('article') : find('main h1');

  const checks = [];

  if (has(inner)) checks.push([`header inner width ${inner.w} == 1520`, inner.w === 1520]);

  if (has(logo) && has(inner))
    checks.push([`logo x (${logo.x}) == header inner x + 16 (${inner.x + 16})`, logo.x === inner.x + 16]);

  if (has(logo) && has(sideGroup))
    checks.push([
      `logo x (${logo.x}) == sidebar group header x (${sideGroup.x})`,
      Math.abs(logo.x - sideGroup.x) <= 2,
    ]);

  // Must occupy the page column, not the gutter.
  if (has(rail) && has(content)) {
    checks.push([`content x (${content.x}) >= sidebar rail right (${rail.right})`, content.x >= rail.right - 2]);
    checks.push([`content width (${content.w}) > 600 (not collapsed into the gutter)`, content.w > 600]);
  }

  const fLogo = find('footer logo');
  if (has(logo) && has(fLogo))
    checks.push([
      `footer logo x (${fLogo.x}) == header logo x (${logo.x})`,
      Math.abs(fLogo.x - logo.x) <= 2,
    ]);
  else checks.push(['site footer present', false]);

  // Compare against the header's own right-most element: both sit inside the shell padding.
  const fCols = find('footer cols');
  const hActions = find('header actions');
  if (has(fCols) && has(hActions))
    checks.push([
      `footer columns right (${fCols.right}) == header actions right (${hActions.right})`,
      Math.abs(fCols.right - hActions.right) <= 2,
    ]);

  const rightEdge = has(toc) ? toc : inner;
  if (has(inner) && has(rightEdge))
    checks.push([
      `header inner right (${inner.right}) == shell right (${rightEdge.right})`,
      Math.abs(inner.right - rightEdge.right) <= 2,
    ]);

  for (const [label, pass] of checks) {
    if (!pass) failures++;
    console.log(`  ${pass ? "ok  " : "FAIL"} ${label}`);
  }
}

// The six nav pills need ~1420px beside the logo and the actions. Showing them any earlier
// overlapped the search box across a 1024-1280px band, which fixed-width checks never saw.
console.log('\n  header pills vs actions, by width');
for (const width of [1600, 1520, 1440, 1439, 1280, 1140, 1024, 900, 768]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/getting-started`, { waitUntil: 'networkidle' });
  const bad = await page.evaluate(() => {
    const shown = (el) => el.getBoundingClientRect().width > 4;
    const pills = [...document.querySelectorAll('header a, #nd-subnav a')].filter(
      (a) =>
        /^(Getting Started|Web App|Python API|REST API|Walkthroughs|Resources)$/.test(
          a.textContent.trim(),
        ) && shown(a),
    );
    if (!pills.length) return null;
    // The search trigger is the left-most action and the thing the pills ran into.
    const search = [...document.querySelectorAll('header button, #nd-subnav button')].find(
      (el) => shown(el) && /search|⌘/i.test(el.textContent + (el.getAttribute('aria-label') ?? '')),
    );
    if (!search) return null;
    const left = search.getBoundingClientRect().left;
    const right = Math.max(...pills.map((el) => el.getBoundingClientRect().right));
    return Number.isFinite(left) && right > left ? { right: Math.round(right), left: Math.round(left) } : null;
  });
  if (bad) {
    failures++;
    console.log(`  FAIL ${width}px: pills reach ${bad.right}, actions start ${bad.left}`);
  } else {
    console.log(`  ok   ${width}px`);
  }
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall layout checks passed');
process.exit(failures ? 1 : 0);
