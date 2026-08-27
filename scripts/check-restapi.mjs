/**
 * Asserts the shape of the nine REST API reference pages: endpoints grouped under their
 * tags, collapsed by default, no generated code samples, no auth inputs, and every TOC
 * anchor resolving to exactly one element.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const SLUGS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'authentication-and-jobs',
      'assay-datasets',
      'models',
      'align',
      'prompt',
      'embeddings',
      'fold',
      'predictor',
      'design',
    ];

const LANGS = ['cURL', 'JavaScript', 'Go', 'Python', 'Java', 'C#', 'Rust'];

const browser = await chromium.launch(
  // CI has no system Chrome; PLAYWRIGHT_CHANNEL=chromium uses Playwright's own build.
  process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? {} : { channel: 'chrome' },
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

for (const slug of SLUGS) {
  const errors = [];
  const external = [];
  page.removeAllListeners('console');
  page.removeAllListeners('request');
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => /openprotein\.ai/.test(new URL(r.url()).host) && external.push(r.url()));

  await page.goto(`${BASE}/rest-api/${slug}`, { waitUntil: 'networkidle' });

  const seen = await page.evaluate((langs) => {
    const root = document.querySelector('[data-rest-api]');
    const rows = [...document.querySelectorAll('[data-rest-api] h3[id],[data-rest-api] h4[id],[data-rest-api] h5[id]')].filter(
      (h) => h.querySelector('button[aria-expanded]') && h.id.length > 0 && !h.id.endsWith('-endpoint'),
    );
    const sections = [...document.querySelectorAll('[data-rest-api] [id$="-endpoint"]')];
    const tocLinks = [...document.querySelectorAll('#nd-toc a[href^="#"]')].map((a) =>
      decodeURIComponent(a.getAttribute('href').slice(1)),
    );

    // Scoped to the endpoint tree: unscoped, any visible element whose whole text is
    // exactly 'Go' or 'Python' - a nav item, a table cell - is a false positive.
    const visibleText = (node) => {
      if (!node) return [];
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const out = [];
      let n;
      while ((n = walk.nextNode())) {
        const t = n.textContent.trim();
        if (t && n.parentElement?.offsetParent !== null) out.push(t);
      }
      return out;
    };

    // One pass over every id, so no attribute selector has to be escaped. CSS.escape
    // emits '\\31 x' for an id starting with a digit, which no naive quoting survives.
    const idCounts = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      idCounts.set(el.id, (idCounts.get(el.id) ?? 0) + 1);
    }

    return {
      root: Boolean(root),
      emptyNotice: document.body.innerText.includes('publishes no endpoints yet'),
      rows: rows.length,
      collapsed: rows.filter((h) => h.querySelector('button[aria-expanded="false"]')).length,
      sections: sections.length,
      openSections: sections.filter((h) => h.querySelector('button[aria-expanded="true"]')).length,
      panelsVisible: [...document.querySelectorAll('[data-rest-api] [role="region"]')].filter(
        (p) => p.offsetParent !== null,
      ).length,
      authInputs: document.querySelectorAll('[data-type="authorization"]').length,
      langTabs: langs.filter((l) => visibleText(root).includes(l)),
      toc: tocLinks.length,
      tocUnresolved: tocLinks.filter((id) => (idCounts.get(id) ?? 0) !== 1),
      firstRow: rows[0]?.id ?? null,
      rowIds: rows.slice(0, 3).map((h) => h.id),
    };
  }, LANGS);

  console.log(
    `/${slug}: ${seen.sections} tags (${seen.openSections} open), ${seen.rows} endpoints (${seen.collapsed} collapsed), ${seen.toc} toc, ${seen.panelsVisible} panels open`,
  );

  // Every page has endpoints now. `models` was an empty spec until upstream started publishing
  // /api/v1/models; a spec that empties out again must still say so rather than render blank.
  if (seen.rows > 0) {
    if (!seen.root) fail('no [data-rest-api] root');
    if (seen.sections === 0) fail('no tag sections');
    if (seen.openSections !== seen.sections) fail(`${seen.sections - seen.openSections} tag sections collapsed`);
    if (seen.collapsed !== seen.rows) fail(`${seen.rows - seen.collapsed} endpoints not collapsed`);
    if (seen.panelsVisible !== 0) fail(`${seen.panelsVisible} endpoint bodies rendered before any click`);
  } else if (!seen.emptyNotice) {
    fail('spec has no operations and renders no notice');
  }
  if (seen.langTabs.length) fail(`code sample tabs present: ${seen.langTabs.join(', ')}`);
  if (seen.authInputs) fail(`${seen.authInputs} authorization panels`);
  if (seen.tocUnresolved.length) fail(`toc anchors unresolved: ${seen.tocUnresolved.join(', ')}`);

  // Expand up to three endpoints. Three, not one: it is the only way to exercise the
  // duplicate-id case (fumadocs emits a literal `request-body` id per operation) and to
  // reach a body with schema fields, which is what the anchor-button CSS rule guards.
  if (seen.rowIds.length) {
    for (const id of seen.rowIds) {
      await page.click(`[id="${id}"] button[aria-expanded]`);
    }
    await page.waitForTimeout(1200);
    const after = await page.evaluate(
      ({ ids, langs }) => {
        const root = document.querySelector('[data-rest-api]');
        const panels = ids.map((id) => document.getElementById(`${id}-content`));
        const leaves = [...(root?.querySelectorAll('*') ?? [])]
          .filter((e) => e.offsetParent !== null && e.children.length === 0)
          .map((e) => e.textContent.trim());
        const anchorButtons = [...(root?.querySelectorAll('button:has(> svg.lucide-link)') ?? [])];
        const counts = new Map();
        for (const el of document.querySelectorAll('[id]')) {
          counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
        }
        return {
          open: panels.every((p) => p && p.offsetParent !== null),
          playground: panels.every((p) => Boolean(p?.querySelector('form,button'))),
          langTabs: langs.filter((l) => leaves.includes(l)),
          // Present in the DOM, hidden by app/global.css: the ids they copy are not
          // unique across operations. `anchorButtons` is logged so a zero - which would
          // make the assertion vacuous - is visible rather than silent.
          anchorButtons: anchorButtons.length,
          visibleAnchorButtons: anchorButtons.filter((b) => b.offsetParent !== null).length,
          // Informational: expected to be non-empty once two bodies are open.
          duplicateIds: [...counts].filter(([, n]) => n > 1).length,
        };
      },
      { ids: seen.rowIds, langs: LANGS },
    );
    console.log(
      `  expanded ${seen.rowIds.length}: ${after.anchorButtons} vendor anchor buttons ` +
        `(${after.visibleAnchorButtons} visible), ${after.duplicateIds} duplicated ids`,
    );
    if (!after.open) fail(`expanding ${seen.rowIds.join(', ')} did not open every panel`);
    if (!after.playground) fail(`an expanded panel rendered no playground`);
    if (after.langTabs.length) fail(`code sample tabs after expand: ${after.langTabs.join(', ')}`);
    if (after.visibleAnchorButtons)
      fail(`${after.visibleAnchorButtons} non-unique schema anchor buttons visible`);

    // Deep link: a fresh load on the fragment must arrive expanded.
    await page.goto(`${BASE}/rest-api/${slug}#${seen.firstRow}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const deep = await page.evaluate((id) => {
      const panel = document.getElementById(`${id}-content`);
      const row = document.getElementById(id);
      return {
        open: Boolean(panel && panel.offsetParent !== null),
        top: row ? Math.round(row.getBoundingClientRect().top) : null,
      };
    }, seen.firstRow);
    if (!deep.open) fail(`deep link #${seen.firstRow} did not open`);
    if (deep.top === null || deep.top < -20 || deep.top > 400)
      fail(`deep link #${seen.firstRow} scrolled to top=${deep.top}`);
  }

  if (errors.length) fail(`console errors: ${errors.slice(0, 3).join(' | ')}`);
  if (external.length) fail(`direct upstream requests: ${external.slice(0, 3).join(' | ')}`);
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
