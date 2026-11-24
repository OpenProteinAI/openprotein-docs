// Golden and deployed page/ID pairs must render uniquely unless individually retired.
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { anchorFindings, browserOptions, publishedSpecs, historicalAnchors, referenceRetirements, sourcePrefix, referenceTargetValid, currentPageAnchors } from './pyapi/check-contract.mjs';

const BASE = process.env.BASE ?? 'http://localhost:5002';
const GOLDEN = 'scripts/pyapi/golden';
const SPECS = 'specs';
const SDK_PIN = JSON.parse(readFileSync('scripts/pyapi/sdk-pin.json', 'utf8'));
const SOURCE_PREFIX = sourcePrefix(SDK_PIN);
const ALL_PAGES = JSON.parse(readFileSync('scripts/pyapi/pages.json', 'utf8')).pages.map((page) => page.page);
const GOLDEN_PAGES = readdirSync(GOLDEN).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
for (const name of process.argv.slice(2)) {
  if (!ALL_PAGES.includes(name)) throw new Error(`Unlisted Python API page: ${name}`);
}
// Section ids (not dotted paths, which the retirement registry covers) retired on purpose.
const RETIRED_SECTION_IDS = { models: ["results-1"] };
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PAGES;

const documents = readdirSync(SPECS)
  .filter((file) => /^openprotein.*\.json$/.test(file))
  .sort()
  .map((file) => [file, JSON.parse(readFileSync(`${SPECS}/${file}`, 'utf8'))]);
const universe = publishedSpecs(documents, SDK_PIN);
const goldenHistory = new Map(GOLDEN_PAGES.map((name) => {
  const golden = JSON.parse(readFileSync(`${GOLDEN}/${name}.json`, 'utf8'));
  return [name, new Set([
    ...golden.classes.map((c) => c.path),
    ...golden.classes.flatMap((c) => c.members.map((m) => m.path)),
    ...golden.module_level.map((m) => m.id),
  ])];
}));
const baseline = JSON.parse(readFileSync('scripts/pyapi/deployed-anchors.json', 'utf8'));
const historical = historicalAnchors(goldenHistory, baseline);
const retirements = JSON.parse(readFileSync('scripts/pyapi/anchor-retirements.json', 'utf8'));
const retired = referenceRetirements(historical, universe, retirements);
for (const owner of new Set(universe.values())) {
  if (!ALL_PAGES.includes(owner)) throw new Error(`Unlisted Python API publication page: ${owner}`);
}

const browser = await chromium.launch(browserOptions());
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

// Every anchor the site publishes, dotted path -> the page that documents it. Read from specs/
// rather than golden/, which is frozen at the old SDK: a link to anything documented since —
// a member 0.17.0 added, a class pages.json now curates — would otherwise read as broken.
// `summary_only` entries are autosummary rows no autoclass backs, so they publish no anchor.
// Whole directory, never just PAGES: a subset run would report every cross-page link as broken.
const headingCounts = new Map();
const headingPage = await browser.newPage();
async function headingsFor(name) {
  if (headingCounts.has(name)) return;
  const url = name === 'index' ? '/references/python-api' : `/references/python-api/${name}`;
  await headingPage.goto(BASE + url, { waitUntil: 'networkidle' });
  const entries = await headingPage.evaluate(() => {
    const counts = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      const count = counts.get(el.id) ?? { ids: 0, headings: 0 };
      count.ids++;
      if (el.matches('article h1, article h2, article h3, article h4, article h5, article h6')) count.headings++;
      counts.set(el.id, count);
    }
    return [...counts];
  });
  headingCounts.set(name, new Map(entries));
}

let anchorsTotal = 0;
let linksTotal = 0;
for (const name of PAGES) {
  const golden = goldenHistory.has(name) ? JSON.parse(readFileSync(`${GOLDEN}/${name}.json`, 'utf8')) : {};
  const { expected, checked, retired: retiredOnPage } = currentPageAnchors(name, historical, retired, universe);
  const summaryRows = (golden.autosummary ?? []).reduce((n, t) => n + t.length, 0);

  const errors = [];
  page.removeAllListeners('console');
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // `index.mdx` is served at the folder URL, not at `/index`.
  const url = name === 'index' ? '/references/python-api' : `/references/python-api/${name}`;
  await page.goto(BASE + url, { waitUntil: 'networkidle' });

  const seen = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    const toc = [...document.querySelectorAll('#nd-toc a[href^="#"]')].map((a) =>
      decodeURIComponent(a.getAttribute('href').slice(1)),
    );
    return {
      ids,
      toc: toc.length,
      tocUnresolved: toc.filter((id) => (counts.get(id) ?? 0) !== 1),
      badges: document.querySelectorAll('article [style*="--py-"]').length,
      sourceLinks: [...document.querySelectorAll('article a[href*="/blob/"]')].map((a) => a.href),
      sourceBadge: [...document.querySelectorAll('article a[href*="/tree/"]')].map((a) => ({
        href: a.href, title: a.getAttribute('title'), text: a.textContent.trim(),
      })),
      summaryRows: document.querySelectorAll('article table tbody tr').length,
      h1: document.querySelector('article h1')?.textContent?.trim() ?? null,
      // Collapse state: groups open, classes closed.
      groups: [...document.querySelectorAll('article section > :is(h2, h3) > button[aria-expanded]')].map(
        (b) => b.getAttribute('aria-expanded'),
      ),
      // Badge = card count, absent for none; cards sit one heading level below their group.
      groupBadges: [...document.querySelectorAll('article section > :is(h2, h3) > button[aria-expanded]')].map((b) => {
        const heading = b.parentElement;
        const cards = [...heading.nextElementSibling.querySelectorAll('div[class*="rounded-xl"] > :is(h3, h4)')];
        const badge = b.querySelector('.tabular-nums');
        return {
          id: heading.id,
          cards: cards.length,
          badge: badge ? badge.textContent.trim() : null,
          cardLevels: [...new Set(cards.map((card) => card.tagName.toLowerCase()))],
          level: heading.tagName.toLowerCase(),
        };
      }),
      // A member heading is one level below its card's.
      badMemberLevels: [...document.querySelectorAll('article div[class*="rounded-xl"] > :is(h3, h4)')].flatMap((card) => {
        const want = `h${Number(card.tagName[1]) + 1}`;
        const body = card.parentElement.querySelector('[role="region"]');
        return [...body.querySelectorAll('[id]')].filter((el) => /^H[1-6]$/.test(el.tagName) && el.tagName.toLowerCase() !== want).map((el) => `${el.id}:${el.tagName.toLowerCase()}!=${want}`);
      }),
      cards: [...document.querySelectorAll('article div[class*="rounded-xl"] > :is(h3, h4) > button[aria-expanded]')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
      // Copy code + Copy link on every card, both before the source link.
      // Only PyCard headings — a plain markdown `###` also lives in an <h3> and carries
      // fumadocs' own "Copy Anchor Link" button, and a group heading has a toggle too.
      copyButtons: [...document.querySelectorAll('article div[class*="rounded-xl"] > :is(h3, h4):has(> button[aria-expanded])')].map((h) => {
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
        ['code-block::', '``python', '](/references/python-api'].filter((needle) => a.textContent.includes(needle)),
      ),
      quotedDoctests: document.querySelectorAll('article div[class*="rounded-xl"] blockquote').length,
      // Cross-references emitted by <TypeRef> / <PySummary>.
      typeLinks: [...document.querySelectorAll('article a[href*="/references/python-api/"]')].map(
        (a) => a.getAttribute('href'),
      ),
    };
  });
  for (const id of RETIRED_SECTION_IDS[name] ?? []) if (seen.ids.includes(id)) fail(`${name}: retired section id #${id} is published`);
  if (name === 'models') for (const id of ['poet', 'rfdiffusion', 'proteinmpnn', 'boltzgen', 'esm-if1']) if (seen.ids.filter((x) => x === id).length !== 1) fail(`models: section #${id} is not published exactly once`);
  if (name === 'models' && seen.ids.filter((id) => id === 'results').length !== 1) fail('models: #results is not published exactly once');
  const findings = anchorFindings(seen.ids, checked, retiredOnPage);

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

  if (findings.missing.length) fail(`${name}: ${findings.missing.length} anchor(s) missing: ${findings.missing.slice(0, 6).join(', ')}`);
  if (findings.duplicated.length) fail(`${name}: duplicated anchor(s): ${findings.duplicated.slice(0, 6).join(', ')}`);
  if (findings.retiredPresent.length) fail(`${name}: retired anchor(s) still rendered: ${findings.retiredPresent.join(', ')}`);
  if (seen.tocUnresolved.length) fail(`${name}: toc anchors unresolved: ${seen.tocUnresolved.slice(0, 6).join(', ')}`);
  if (checked.length && !seen.badges) fail(`${name}: no kind badges rendered`);
  if (summaryRows && seen.summaryRows < summaryRows)
    fail(`${name}: ${seen.summaryRows} summary rows, Sphinx rendered ${summaryRows}`);
  // Source links must use the pinned commit, not a movable tag. SHA read from the pin.
  const bad = seen.sourceLinks.filter(
    (h) => !h.startsWith(SOURCE_PREFIX),
  );
  if (bad.length) fail(`${name}: source link not pinned to the SDK commit: ${bad[0]}`);
  if (SDK_PIN.branch) {
    const expectedHref = `${SDK_PIN.repository}/tree/${SDK_PIN.commit}`;
    const expectedTitle = `${SDK_PIN.package} ${SDK_PIN.version} at ${SDK_PIN.commit}`;
    if (seen.sourceBadge.length !== 1 || seen.sourceBadge[0].href !== expectedHref
        || seen.sourceBadge[0].title !== expectedTitle || seen.sourceBadge[0].text !== `SDK ${SDK_PIN.branch}`) {
      fail(`${name}: SDK source badge does not disclose the pinned branch, version and commit`);
    }
  }
  // Groups open by default, classes collapsed by default, no body visible on arrival.
  if (seen.groups.some((state) => state !== 'true'))
    fail(`${name}: ${seen.groups.filter((s) => s !== 'true').length} group(s) collapsed`);
  for (const group of seen.groupBadges) {
    if (group.cards === 0 && group.badge !== null) fail(`${name}: #${group.id} has no cards but shows a "${group.badge}" count badge`);
    if (group.cards > 0 && group.badge !== String(group.cards))
      fail(`${name}: #${group.id} has ${group.cards} card(s) but badge ${JSON.stringify(group.badge)}`);
    const want = group.level === 'h3' ? ['h4'] : ['h3'];
    if (group.cards && group.cardLevels.join() !== want.join())
      fail(`${name}: #${group.id} (${group.level}) has cards at ${group.cardLevels.join()}, expected ${want}`);
  }
  if (seen.badMemberLevels.length) fail(`${name}: member heading not one level below its card: ${seen.badMemberLevels.slice(0, 3).join(', ')}`);
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
    const target = route.replace('/references/python-api/', '') || 'index';
    if (!fragment) continue;
    linksTotal += 1;
    if (!fragment.startsWith('openprotein.') && fragment !== 'openprotein' && ALL_PAGES.includes(target)) await headingsFor(target);
    if (!referenceTargetValid(target, fragment, universe, ALL_PAGES, headingCounts)) broken.push(href);
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
if (retirements.length) console.log(`${retirements.length} recorded anchor retirement(s)`);
process.exit(failures ? 1 : 0);
