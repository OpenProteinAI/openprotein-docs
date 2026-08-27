/**
 * Load every docs page in Chrome: 200, an h1, real body text, no broken image, no failing
 * request, no console error, no RST or pandoc markup rendered as text. Needs a server on :5001.
 *
 *   pnpm check:content   |   node scripts/check-content.mjs /web-app /resources/faq
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const DOCS = 'content/docs';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.mdx') ? [full] : [];
  });

const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : walk(DOCS)
      .map((file) => '/' + relative(DOCS, file).replace(/\.mdx$/, '').replace(/\/index$/, ''))
      .sort();

// Markup that survived conversion and reaches the reader as literal text.
const RST_LEAKS = [
  { pattern: /\.\.\s+[a-z-]+::/, what: 'an RST directive' },
  { pattern: /:(?:py:)?(?:class|meth|func|attr|doc|ref|cite):`/, what: 'an RST role' },
  { pattern: /`[^`\n]+`_/, what: 'an RST link' },
  // No trailing `_`: parses as nothing, so the backticks and URL reach the reader.
  { pattern: /[`'][^`'\n]{2,60}\s*<https?:\/\/[^>\n]+>[`']/, what: 'malformed RST link markup' },
  { pattern: /RAW HTML|- REVIEW/, what: 'a conversion marker' },
  { pattern: /\{=(?:rst|html|latex|tex)\}/, what: "a pandoc raw-inline annotation" },
];

const browser = await chromium.launch(
  // CI has no system Chrome; PLAYWRIGHT_CHANNEL=chromium uses Playwright's own build.
  process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

let failures = 0;
const fail = (route, message) => {
  failures++;
  console.log(`  FAIL ${route}\n       ${message}`);
};

let totalImages = 0;
for (const route of routes) {
  const consoleErrors = [];
  const badResponses = [];
  page.removeAllListeners('console');
  page.removeAllListeners('response');
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Next inlines the RSC payload in bare <script> tags; dev-only, absent from a build.
    if (text.startsWith('Encountered a script tag while rendering React component')) return;
    consoleErrors.push(text);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  if (!response || response.status() !== 200) {
    fail(route, `HTTP ${response ? response.status() : 'no response'}`);
    continue;
  }

  const seen = await page.evaluate(() => {
    const article = document.querySelector('article') ?? document.body;
    return {
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      text: article.innerText,
      images: [...article.querySelectorAll('img')].map((img) => ({
        src: img.currentSrc || img.src,
        broken: img.complete && img.naturalWidth === 0,
      })),
    };
  });

  if (!seen.h1) fail(route, 'no <h1>');
  if (seen.text.trim().length < 40) fail(route, `body is ${seen.text.trim().length} chars`);
  for (const { pattern, what } of RST_LEAKS) {
    const hit = seen.text.match(pattern);
    if (hit) fail(route, `${what} rendered as text: ${JSON.stringify(hit[0].slice(0, 60))}`);
  }
  const broken = seen.images.filter((img) => img.broken);
  if (broken.length) fail(route, `${broken.length} broken image(s): ${broken[0].src}`);
  totalImages += seen.images.length;
  const assets = badResponses.filter((line) => !line.includes('/api/'));
  if (assets.length) fail(route, `${assets.length} failing request(s): ${assets[0]}`);
  if (consoleErrors.length) fail(route, `console: ${consoleErrors[0].slice(0, 160)}`);
}

await browser.close();
console.log(
  failures
    ? `\n${failures} failure(s) across ${routes.length} page(s)`
    : `\nall ${routes.length} page(s) render — ${totalImages} images, no console errors, no RST leakage`,
);
process.exit(failures ? 1 : 0);
