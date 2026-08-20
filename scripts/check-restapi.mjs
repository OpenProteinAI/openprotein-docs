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

const browser = await chromium.launch({ channel: 'chrome' });
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

    const visibleText = (node) => {
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const out = [];
      let n;
      while ((n = walk.nextNode())) {
        const t = n.textContent.trim();
        if (t && n.parentElement?.offsetParent !== null) out.push(t);
      }
      return out;
    };

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
      langTabs: langs.filter((l) => visibleText(document.body).includes(l)),
      anchorButtons: document.querySelectorAll('[data-rest-api] button:has(> svg.lucide-link)').length,
      visibleAnchorButtons: [...document.querySelectorAll('[data-rest-api] button:has(> svg.lucide-link)')].filter(
        (b) => b.offsetParent !== null,
      ).length,
      toc: tocLinks.length,
      tocUnresolved: tocLinks.filter((id) => document.querySelectorAll(`[id="${CSS.escape(id).replace(/\\/g, '')}"]`).length !== 1),
      firstRow: rows[0]?.id ?? null,
    };
  }, LANGS);

  console.log(
    `/${slug}: ${seen.sections} tags (${seen.openSections} open), ${seen.rows} endpoints (${seen.collapsed} collapsed), ${seen.toc} toc, ${seen.panelsVisible} panels open`,
  );

  // `models` is an empty spec by design - /api/v1/models exists on neither backend.
  if (slug !== 'models') {
    if (!seen.root) fail('no [data-rest-api] root');
    if (seen.rows === 0) fail('no endpoint rows');
    if (seen.sections === 0) fail('no tag sections');
    if (seen.openSections !== seen.sections) fail(`${seen.sections - seen.openSections} tag sections collapsed`);
    if (seen.collapsed !== seen.rows) fail(`${seen.rows - seen.collapsed} endpoints not collapsed`);
    if (seen.panelsVisible !== 0) fail(`${seen.panelsVisible} endpoint bodies rendered before any click`);
  } else if (!seen.emptyNotice) {
    fail('empty spec renders no notice');
  }
  if (seen.langTabs.length) fail(`code sample tabs present: ${seen.langTabs.join(', ')}`);
  if (seen.authInputs) fail(`${seen.authInputs} authorization panels`);
  if (seen.visibleAnchorButtons) fail(`${seen.visibleAnchorButtons} non-unique schema anchor buttons visible`);
  if (seen.tocUnresolved.length) fail(`toc anchors unresolved: ${seen.tocUnresolved.join(', ')}`);

  // Expand the first endpoint: its body must appear, still with no snippet tabs.
  if (seen.firstRow) {
    await page.click(`[id="${seen.firstRow}"] button[aria-expanded]`);
    await page.waitForTimeout(400);
    const after = await page.evaluate(
      ({ id, langs }) => {
        const panel = document.getElementById(`${id}-content`);
        const visibleText = new Set(
          [...document.querySelectorAll('body *')]
            .filter((e) => e.offsetParent !== null && e.children.length === 0)
            .map((e) => e.textContent.trim()),
        );
        return {
          open: Boolean(panel && panel.offsetParent !== null),
          playground: Boolean(panel?.querySelector('form,button')),
          langTabs: langs.filter((l) => visibleText.has(l)),
        };
      },
      { id: seen.firstRow, langs: LANGS },
    );
    if (!after.open) fail(`clicking ${seen.firstRow} did not open it`);
    if (!after.playground) fail(`${seen.firstRow} opened with no playground`);
    if (after.langTabs.length) fail(`code sample tabs after expand: ${after.langTabs.join(', ')}`);

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
