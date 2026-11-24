/** Every image referenced by a page or notebook, and every internal doc link, must resolve. */
import { readFile, glob } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HTML_SRC = /<img\b[^>]*?\bsrc[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const ANY_SRC = /\bsrc[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const MD_IMAGE = /!\[[^\]]*\]\([ \t]*<?([^)\s>]+)/g;
const MD_LINK = /(?<!!)\[[^\]]*\]\([ \t]*<?([^)\s>]+)/g;

async function list(pattern) {
  const out = [];
  for await (const f of glob(pattern, { cwd: ROOT })) out.push(f);
  return out.sort();
}

const read = (rel) => readFile(path.join(ROOT, rel), 'utf8');

// Absolute URIs, protocol-relative URLs, data: and attachment: refs are all out of scope.
const isExternal = (ref) => /^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(ref);

function srcMatches(re, text) {
  re.lastIndex = 0;
  return [...text.matchAll(re)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}

/** Maps an authored image ref onto the public/ file it must resolve to. */
function toPublic(ref) {
  let u = ref.trim().split(/[?#]/)[0];
  if (u.includes('%')) {
    try {
      u = decodeURIComponent(u);
    } catch {}
  }
  u = u.replace(/^\.\//, '/').replace(/^(?:\.\.\/)+/, '/');
  if (!u.startsWith('/')) u = `/${u}`;
  return `public${u}`;
}

// `(group)` folders add no URL segment.
const routeOf = (mdx) =>
  mdx
    .replace(/^content\/docs/, '')
    .replace(/\/\([^/]+\)/g, '')
    .replace(/\.mdx$/, '')
    .replace(/\/index$/, '') || '/';

const routeKey = (href) => href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

const groups = [];

/** Resolves image refs for one group, splitting genuine misses from known upstream typos. */
function imageGroup(label, refs) {
  const missing = [];
  const warns = [];
  for (const { ref, file } of refs) {
    const target = toPublic(ref);
    if (existsSync(path.join(ROOT, target))) continue;
    const fixed = target.replace('public/static/', 'public/_static/');
    if (fixed !== target && existsSync(path.join(ROOT, fixed)))
      warns.push({ ref, file, note: `typo in old source; asset exists at ${fixed}` });
    else missing.push({ ref, file, note: `expected ${target}` });
  }
  groups.push({ label, count: refs.length, unit: 'referenced', bad: 'missing', missing, warns });
}

const nbRefs = [];
const nbFiles = await list('content/notebooks/**/*.ipynb');
for (const file of nbFiles) {
  const nb = JSON.parse(await read(file));
  for (const cell of nb.cells ?? []) {
    if (cell.cell_type !== 'markdown') continue;
    const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '');
    const refs = [...src.matchAll(MD_IMAGE)].map((m) => m[1]);
    refs.push(...srcMatches(HTML_SRC, src));
    for (const ref of refs) if (ref && !isExternal(ref.trim())) nbRefs.push({ ref, file });
  }
}
imageGroup('notebook images', nbRefs);

const mdxFiles = await list('content/docs/**/*.mdx');
const mdxTexts = new Map();
for (const file of mdxFiles) mdxTexts.set(file, await read(file));

const mdxRefs = [];
for (const [file, text] of mdxTexts) {
  const refs = [...text.matchAll(MD_IMAGE)].map((m) => m[1]);
  refs.push(...srcMatches(ANY_SRC, text));
  for (const ref of refs) if (ref && !isExternal(ref.trim())) mdxRefs.push({ ref, file });
}
imageGroup('mdx images', mdxRefs);

// Static app pages, e.g. /models.
const appRoutes = (await list('app/**/page.tsx'))
  .map((f) => f.replace(/^app/, '').replace(/\/\([^/]+\)/g, '').replace(/\/page\.tsx$/, '') || '/')
  .filter((r) => !r.includes('['));
const routes = new Set([...mdxFiles.map(routeOf), ...appRoutes]);
const links = [];
for (const [file, text] of mdxTexts) {
  for (const m of text.matchAll(MD_LINK)) {
    const href = m[1].trim();
    if (!href.startsWith('/') || href.startsWith('/_static/')) continue;
    links.push({ ref: href, file });
  }
}
const linkMissing = [];
for (const { ref, file } of links) {
  if (routes.has(routeKey(ref))) continue;
  linkMissing.push({ ref, file, note: `no page for route ${routeKey(ref)}` });
}
groups.push({
  label: 'mdx links',
  count: links.length,
  unit: 'internal',
  bad: 'broken',
  missing: linkMissing,
  warns: [],
});

const EXACT = ['public/_static/js', 'public/_static/css'];
const SWEEPS = ['public/**/.DS_Store', 'content/**/.DS_Store'];
const forbidden = [];
for (const rel of EXACT)
  if (existsSync(path.join(ROOT, rel)))
    forbidden.push({ ref: rel, note: 'must not be copied from the Sphinx build' });
for (const pattern of SWEEPS)
  for (const f of await list(pattern)) forbidden.push({ ref: f, note: 'must not be committed' });
groups.push({
  label: 'forbidden paths',
  count: EXACT.length + SWEEPS.length,
  unit: 'rules',
  bad: 'violations',
  missing: forbidden,
  warns: [],
});

let failed = 0;
for (const g of groups) {
  const status = g.missing.length ? 'FAIL' : 'ok';
  if (g.missing.length) failed += g.missing.length;
  const warn = g.warns.length ? `, ${g.warns.length} warn` : '';
  const n = String(g.count).padStart(3);
  console.log(
    `${status.padEnd(5)} ${g.label.padEnd(17)} ${n} ${g.unit}, ${g.missing.length} ${g.bad}${warn}`,
  );
}

function detail(tag, label, e) {
  const where = e.file ? `\n        referenced by ${e.file}` : '';
  console.log(`\n  ${tag}  ${label}: ${e.ref}\n        ${e.note}${where}`);
}

for (const g of groups) {
  for (const m of g.missing) detail('FAIL', g.label, m);
  for (const w of g.warns) detail('WARN', g.label, w);
}

const warnTotal = groups.reduce((n, g) => n + g.warns.length, 0);
const checked = groups.reduce((n, g) => n + g.count, 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
console.log(
  `\n${checked} checks across ${groups.length} groups: ${plural(failed, 'failure')}, ${plural(warnTotal, 'warning')}.`,
);
if (failed) {
  console.error(`\n${plural(failed, 'failure')} — a reference points at something that is not there.`);
  process.exit(1);
}
console.log('\nall references resolve.');
