/**
 * Fetch every GitHub and Colab link the rendered pages emit.
 *
 * "Edit this page" pointed at a branch with no content/docs and 404'd on every page, and the
 * notebook badges resolved to the old Sphinx copy under source/. Neither showed up in any check.
 * Needs the network, so it is opt-in.
 *
 *   pnpm check:github     # BASE defaults to :5001
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const PAGES = [
  '/getting-started',
  '/getting-started/account-page',
  '/web-app',
  '/web-app/opmodels/design',
  '/python-api',
  '/python-api/quickstart',
  '/python-api/api-reference/fold',
  '/python-api/poet/creating-MSA',
  '/walkthroughs/predicting-fitness',
  '/rest-api/fold',
  '/resources/faq',
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage();
const urls = new Map();

for (const path of PAGES) {
  const response = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (!response || response.status() !== 200) {
    console.log(`  FAIL ${path} -> HTTP ${response?.status()}`);
    continue;
  }
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')]
      .map((a) => a.href)
      .filter((href) => /^https:\/\/(github\.com|colab\.research\.google\.com|raw\.githubusercontent\.com)\//.test(href)),
  );
  // Only our own repo and the notebooks it hosts; third-party links are not ours to guarantee.
  for (const url of found) {
    if (!/openprotein-docs|openprotein-python/.test(url)) continue;
    if (url.includes('/issues/new')) continue;
    if (!urls.has(url)) urls.set(url, path);
  }
}
await browser.close();

let failures = 0;
for (const [url, from] of [...urls].sort()) {
  // Colab rejects HEAD.
  const method = url.includes('colab.research') ? 'GET' : 'HEAD';
  let status;
  try {
    status = (await fetch(url, { method, redirect: 'follow' })).status;
  } catch (error) {
    status = `error: ${error.message}`;
  }
  if (status !== 200) {
    failures++;
    console.log(`  FAIL ${status}  ${url}\n       first seen on ${from}`);
  }
}

console.log(
  failures
    ? `\n${failures} of ${urls.size} repo link(s) do not resolve`
    : `\nall ${urls.size} repo link(s) across ${PAGES.length} pages resolve`,
);
process.exit(failures ? 1 : 0);
