/**
 * Asserts the rendered Python API pages against scripts/pyapi/golden/ — what the live Sphinx
 * site published. Every dotted anchor it had must exist here, exactly once, because those are
 * the inbound deep links (`…/fold.html#openprotein.fold.FoldAPI.get_results`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const GOLDEN = 'scripts/pyapi/golden';
const SDK_COMMIT = JSON.parse(readFileSync('scripts/pyapi/sdk-pin.json', 'utf8')).commit;
const ALL_PAGES = readdirSync(GOLDEN)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PAGES;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

// ALL_PAGES, never PAGES: a subset run would report every cross-page link as broken.
const universe = new Map();
for (const name of ALL_PAGES) {
  const g = JSON.parse(readFileSync(`${GOLDEN}/${name}.json`, 'utf8'));
  for (const c of g.classes) {
    universe.set(c.path, name);
    for (const m of c.members) universe.set(m.path, name);
  }
  for (const m of g.module_level) universe.set(m.id, name);
}

let anchorsTotal = 0;
let linksTotal = 0;
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
      // Collapse state: groups open, classes closed.
      groups: [...document.querySelectorAll('article section > h2 > button[aria-expanded]')].map(
        (b) => b.getAttribute('aria-expanded'),
      ),
      cards: [...document.querySelectorAll('article h3 > button[aria-expanded]')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
      // Copy code + Copy link on every card, both before the source link.
      // Only PyCard headings — a plain markdown `###` also lives in an <h3> and carries
      // fumadocs' own "Copy Anchor Link" button.
      copyButtons: [...document.querySelectorAll('article h3:has(> button[aria-expanded])')].map((h) => {
        const labels = [...h.querySelectorAll('button[aria-label^="Copy"]')].map((b) =>
          b.getAttribute('aria-label'),
        );
        const source = h.querySelector('a[href*="/blob/"]');
        const last = labels.length ? h.querySelector('button[aria-label="Copy link"]') : null;
        const ordered =
          !source || !last || last.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING;
        return { labels, ordered: Boolean(ordered) };
      }),
      visibleBodies: [...document.querySelectorAll('article [role="region"]')].filter(
        (r) => r.offsetParent !== null,
      ).length,
      // Docstring prose must arrive as rendered markdown, not as RST source. `code-block::`
      // leaking means the directive was not fenced; a blockquote inside a card means a `>>>`
      // doctest was read as markdown quoting; `](/ ` means a link printed literally.
      rstLeaks: [...document.querySelectorAll('article')].flatMap((a) =>
        ['code-block::', '``python', '](/python-api'].filter((needle) => a.textContent.includes(needle)),
      ),
      quotedDoctests: document.querySelectorAll('article div[class*="rounded-xl"] blockquote').length,
      // Cross-references emitted by <TypeRef> / <PySummary>.
      typeLinks: [...document.querySelectorAll('article a[href*="/python-api/api-reference/"]')].map(
        (a) => a.getAttribute('href'),
      ),
    };
  }, expected);

  anchorsTotal += expected.length;
  console.log(
    `  ${name.padEnd(13)} ${String(expected.length).padStart(3)} anchors  ` +
      `${String(seen.toc).padStart(3)} toc  ${String(seen.badges).padStart(3)} badges  ` +
      `${String(seen.sourceLinks.length).padStart(3)} src  ` +
      `${String(seen.groups.length).padStart(2)} groups  ${String(seen.cards.length).padStart(3)} cards  ` +
      `${String(seen.typeLinks.length).padStart(3)} xrefs  ` +
      `${seen.copyButtons.filter((c) => c.labels.length === 2).length}/${seen.copyButtons.length} copy pairs` +
      (summaryRows ? `  ${seen.summaryRows}/${summaryRows} summary rows` : ''),
  );

  if (seen.missing.length) fail(`${name}: ${seen.missing.length} anchor(s) missing: ${seen.missing.slice(0, 6).join(', ')}`);
  if (seen.duplicated.length) fail(`${name}: duplicated anchor(s): ${seen.duplicated.slice(0, 6).join(', ')}`);
  if (seen.tocUnresolved.length) fail(`${name}: toc anchors unresolved: ${seen.tocUnresolved.slice(0, 6).join(', ')}`);
  if (expected.length && !seen.badges) fail(`${name}: no kind badges rendered`);
  if (summaryRows && seen.summaryRows < summaryRows)
    fail(`${name}: ${seen.summaryRows} summary rows, Sphinx rendered ${summaryRows}`);
  // Source links must use the pinned commit, not a movable tag. SHA read from the pin.
  const bad = seen.sourceLinks.filter(
    (h) => !h.startsWith(`https://github.com/OpenProteinAI/openprotein-python/blob/${SDK_COMMIT}/`),
  );
  if (bad.length) fail(`${name}: source link not pinned to a tag: ${bad[0]}`);
  // Groups open by default, classes collapsed by default, no body visible on arrival.
  if (seen.groups.some((state) => state !== 'true'))
    fail(`${name}: ${seen.groups.filter((s) => s !== 'true').length} group(s) collapsed`);
  if (seen.cards.length && seen.cards.some((state) => state !== 'false'))
    fail(`${name}: ${seen.cards.filter((s) => s !== 'false').length} class(es) expanded on load`);
  if (seen.visibleBodies) fail(`${name}: ${seen.visibleBodies} class body/bodies visible on load`);

  const missingCopy = seen.copyButtons.filter(
    (c) => c.labels.join(',') !== 'Copy code,Copy link',
  );
  if (missingCopy.length)
    fail(`${name}: ${missingCopy.length} card(s) without Copy code + Copy link: ${JSON.stringify(missingCopy[0])}`);
  if (seen.rstLeaks.length) fail(`${name}: unrendered RST in prose: ${seen.rstLeaks.join(', ')}`);
  if (seen.quotedDoctests)
    fail(`${name}: ${seen.quotedDoctests} doctest block(s) rendered as a blockquote`);

  const misordered = seen.copyButtons.filter((c) => !c.ordered);
  if (misordered.length) fail(`${name}: ${misordered.length} card(s) put the source link before the copy buttons`);

  // Every cross-reference must point at an anchor this site actually publishes.
  const broken = [];
  for (const href of seen.typeLinks) {
    const [route, fragment] = href.split('#');
    const target = route.replace('/python-api/api-reference/', '') || 'index';
    if (!fragment) continue;
    linksTotal += 1;
    if (universe.get(fragment) !== target) broken.push(href);
  }
  if (broken.length)
    fail(`${name}: ${broken.length} cross-reference(s) point nowhere: ${broken.slice(0, 4).join(', ')}`);

  if (errors.length) fail(`${name}: console errors: ${errors.slice(0, 2).join(' | ')}`);
}

await browser.close();
console.log(
  failures
    ? `\n${failures} failure(s)`
    : `\nall checks passed — ${anchorsTotal} dotted anchors present and unique, ` +
      `${linksTotal} cross-references resolve`,
);
process.exit(failures ? 1 : 0);
