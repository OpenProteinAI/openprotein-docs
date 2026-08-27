/**
 * Every URL the old Sphinx site served must still lead somewhere.
 *
 * Derived from `__old/source` rather than hand-listed: Sphinx mirrored the tree with `.html`
 * suffixes at the domain root, so every `.rst` and `.ipynb` is one URL. Also checks the
 * non-page surfaces and a set of deep fragments, which no redirect can fix — the ids have to
 * be present in the markup.
 *
 *   pnpm check:urls                 # against BASE (default :5001)
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:5001';
const SRC = '__old/source';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '_static' ? [] : walk(full);
    return /\.(rst|ipynb)$/.test(full) ? [full] : [];
  });

const pages = walk(SRC)
  .map((file) => '/' + relative(SRC, file).replace(/\.(rst|ipynb)$/, '') + '.html')
  .sort();

/** Non-page surfaces, with the status each must answer. */
const SURFACES = [
  ['/_static/coverage.svg', 200],
  ['/_static/overview-img/DocsHome_1.png', 200],
  ['/_modules/openprotein/fold/fold.html', 200],
  ['/genindex.html', 200],
  ['/py-modindex.html', 200],
  ['/search.html', 200],
  ['/404.html', 404],
  ['/objects.inv', 404],
  ['/searchindex.js', 404],
  ['/robots.txt', 200],
  ['/sitemap.xml', 200],
  ['/llms.txt', 200],
  ['/llms-full.txt', 200],
];

/** Deep links whose fragment must exist in the delivered markup. */
const FRAGMENTS = [
  ['/python-api/api-reference/fold.html', 'openprotein.fold.FoldAPI.get_results'],
  ['/python-api/api-reference/fold.html', 'openprotein.fold.Boltz2Model'],
  ['/python-api/api-reference/embedding.html', 'openprotein.embeddings.PoET2Model'],
  ['/python-api/api-reference/models.html', 'proteinmpnn'],
  ['/python-api/api-reference/models.html', 'rfdiffusion'],
  ['/python-api/api-reference/models.html', 'boltzgen'],
  ['/python-api/api-reference/models.html', 'models'],
  ['/walkthroughs/Protein_protein_binder_design_with_RFdiffusion.html', 'Prerequisites'],
  ['/python-api/structure-prediction/Using_ESMFold2.html', 'Using-ESMFold2'],
  ['/rest-api/authentication-and-jobs.html', 'jobs'],
];

let failures = 0;
const fail = (message) => {
  failures++;
  console.log(`  FAIL ${message}`);
};

async function land(url) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${BASE}${current}`, { redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return { status: response.status, hops, url: current };
    const location = response.headers.get('location');
    if (!location) return { status: response.status, hops, url: current };
    hops.push(response.status);
    current = new URL(location, BASE).pathname;
  }
  return { status: 508, hops, url: current };
}

for (const page of pages) {
  const { status, hops, url } = await land(page);
  if (status !== 200) fail(`${page} -> ${hops.join(',') || 'no redirect'} -> ${url} ${status}`);
  else if (hops[0] !== 301) fail(`${page} answered ${status} without a 301 (hops: ${hops.join(',') || 'none'})`);
}

for (const [url, want] of SURFACES) {
  const { status } = await land(url);
  if (status !== want) fail(`${url} -> ${status}, expected ${want}`);
}

for (const [url, fragment] of FRAGMENTS) {
  const { status, url: landed } = await land(url);
  if (status !== 200) {
    fail(`${url}#${fragment} -> ${status}`);
    continue;
  }
  const html = await fetch(`${BASE}${landed}`).then((response) => response.text());
  if (!html.includes(`id="${fragment}"`)) fail(`${url}#${fragment} — no element with that id on ${landed}`);
}

console.log(
  failures
    ? `\n${failures} failure(s) across ${pages.length} old page URLs, ${SURFACES.length} surfaces, ${FRAGMENTS.length} fragments`
    : `\nall ${pages.length} old page URLs 301 to a 200; ${SURFACES.length} surfaces and ${FRAGMENTS.length} deep fragments check out`,
);
process.exit(failures ? 1 : 0);
