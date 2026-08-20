/**
 * Asserts the rendered Python API pages against scripts/pyapi/golden/ — what the live Sphinx
 * site published. Every dotted anchor it had must exist here, exactly once, because those are
 * the inbound deep links (`…/fold.html#openprotein.fold.FoldAPI.get_results`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const GOLDEN = 'scripts/pyapi/golden';
const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(GOLDEN)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

let anchorsTotal = 0;
for (const name of PAGES) {
  const golden = JSON.parse(readFileSync(`${GOLDEN}/${name}.json`, 'utf8'));
  const expected = [
    ...golden.classes.map((c) => c.path),
    ...golden.classes.flatMap((c) => c.members.map((m) => m.path)),
    ...golden.module_level.map((m) => m.id),
  ];
  const summaryRows = (golden.autosummary ?? []).reduce((n, t) => n + t.length, 0);

  const errors = [];
  page.removeAllListeners('console');
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // `index.mdx` is served at the folder URL, not at `/index`.
  const url = name === 'index' ? '/python-api/api-reference' : `/python-api/api-reference/${name}`;
  await page.goto(BASE + url, { waitUntil: 'networkidle' });

  const seen = await page.evaluate((want) => {
    const counts = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
    }
    const toc = [...document.querySelectorAll('#nd-toc a[href^="#"]')].map((a) =>
      decodeURIComponent(a.getAttribute('href').slice(1)),
    );
    return {
      missing: want.filter((id) => !counts.has(id)),
      duplicated: want.filter((id) => (counts.get(id) ?? 0) > 1),
      toc: toc.length,
      tocUnresolved: toc.filter((id) => (counts.get(id) ?? 0) !== 1),
      badges: document.querySelectorAll('article [style*="--py-"]').length,
      sourceLinks: [...document.querySelectorAll('article a[href*="/blob/"]')].map((a) => a.href),
      summaryRows: document.querySelectorAll('article table tbody tr').length,
      h1: document.querySelector('article h1')?.textContent?.trim() ?? null,
    };
  }, expected);

  anchorsTotal += expected.length;
  console.log(
    `  ${name.padEnd(13)} ${String(expected.length).padStart(3)} anchors  ` +
      `${String(seen.toc).padStart(3)} toc  ${String(seen.badges).padStart(3)} badges  ` +
      `${String(seen.sourceLinks.length).padStart(3)} source links` +
      (summaryRows ? `  ${seen.summaryRows}/${summaryRows} summary rows` : ''),
  );

  if (seen.missing.length) fail(`${name}: ${seen.missing.length} anchor(s) missing: ${seen.missing.slice(0, 6).join(', ')}`);
  if (seen.duplicated.length) fail(`${name}: duplicated anchor(s): ${seen.duplicated.slice(0, 6).join(', ')}`);
  if (seen.tocUnresolved.length) fail(`${name}: toc anchors unresolved: ${seen.tocUnresolved.slice(0, 6).join(', ')}`);
  if (expected.length && !seen.badges) fail(`${name}: no kind badges rendered`);
  if (summaryRows && seen.summaryRows < summaryRows)
    fail(`${name}: ${seen.summaryRows} summary rows, Sphinx rendered ${summaryRows}`);
  const bad = seen.sourceLinks.filter((h) => !/^https:\/\/github\.com\/OpenProteinAI\/openprotein-python\/blob\/v\d/.test(h));
  if (bad.length) fail(`${name}: source link not pinned to a tag: ${bad[0]}`);
  if (errors.length) fail(`${name}: console errors: ${errors.slice(0, 2).join(' | ')}`);
}

await browser.close();
console.log(
  failures
    ? `\n${failures} failure(s)`
    : `\nall checks passed — ${anchorsTotal} dotted anchors present and unique`,
);
process.exit(failures ? 1 : 0);
