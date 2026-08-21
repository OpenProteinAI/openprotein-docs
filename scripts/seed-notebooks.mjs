/**
 * Write one wrapper .mdx per notebook, at the route the old Sphinx site served.
 *
 *   node scripts/seed-notebooks.mjs            # write only what is missing
 *   node scripts/seed-notebooks.mjs --force    # overwrite; hand edits are lost
 *   node scripts/seed-notebooks.mjs --check    # fail if any notebook has no wrapper
 *
 * **The filename is the notebook's stem, verbatim.** nbsphinx served
 * `/walkthroughs/Protein_protein_binder_design_with_RFdiffusion.html`, so the wrapper must be
 * `Protein_protein_binder_design_with_RFdiffusion.mdx` or the Phase 9 `.html` -> extensionless
 * redirect lands on nothing. Do not "tidy" these to kebab-case.
 *
 * Title and description come from the notebook's first markdown heading and the prose under it.
 * The badge cell that opens some notebooks is skipped — it is Colab/GitHub links, not prose, and
 * the renderer draws its own badges from the notebook path.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const NOTEBOOKS = 'content/notebooks';
const DOCS = 'content/docs';
const force = process.argv.includes('--force');
const check = process.argv.includes('--check');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ipynb') ? [full] : [];
  });

/** Strip markdown so a title or description is plain text, as the frontmatter schema wants. */
const plain = (text) =>
  text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Some notebooks were pandoc-converted at some point and carry Sphinx roles inside pandoc
    // raw-inline spans: ``` `` :py:class:`~openprotein.x.Y` ``{=rst} ```. Reduce the role to its
    // last dotted component and drop the annotation, or the subtitle prints the markup —
    // `pnpm check:content` caught exactly that on Using_AbLang2.
    .replace(
      /`*\s*:(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data):`\s*(?:[^<`]+?\s*<([^>`]+)>|~?([^`]+?))\s*`\s*`*(?:\{=\w+\})?/g,
      (_whole, target, bare) => ((target ?? bare) || '').split('.').pop() ?? '',
    )
    .replace(/\{=\w+\}/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+([),.;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const meta = (file) => {
  const nb = JSON.parse(readFileSync(file, 'utf8'));
  let title = null;
  let description = null;
  for (const cell of nb.cells ?? []) {
    if (cell.cell_type !== 'markdown') continue;
    const source = (cell.source ?? []).join('');
    // The badge cell is images and links only; it has no heading and no prose.
    const heading = source.match(/^#{1,2}\s+(.+)$/m);
    if (!title && heading) title = plain(heading[1]);
    if (title && !description) {
      const after = heading ? source.slice(source.indexOf(heading[0]) + heading[0].length) : source;
      const paragraph = after
        .split(/\n\s*\n/)
        .map((p) => plain(p))
        .find((p) => p.length > 40 && !p.startsWith('#'));
      if (paragraph) {
        const sentence = paragraph.match(/^.*?[.!?](?=\s|$)/);
        description = (sentence ? sentence[0] : paragraph).slice(0, 240).trim();
      }
    }
    if (title && description) break;
  }
  return { title, description };
};

let written = 0;
const missing = [];
const skipped = [];

for (const file of walk(NOTEBOOKS).sort()) {
  const rel = relative(NOTEBOOKS, file).replace(/\.ipynb$/, '');
  const dest = join(DOCS, `${rel}.mdx`);
  if (existsSync(dest) && !force) {
    skipped.push(rel);
    continue;
  }
  if (check) {
    missing.push(rel);
    continue;
  }
  const { title, description } = meta(file);
  if (!title) {
    console.log(`  WARN ${rel}: no markdown heading — title left as the stem, edit by hand`);
  }
  const front = [
    '---',
    `title: ${JSON.stringify(title ?? rel.split('/').pop())}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    `notebook: ${relative(NOTEBOOKS, file)}`,
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, front, 'utf8');
  written++;
}

if (check) {
  for (const rel of missing) console.log(`  FAIL ${rel}: no wrapper page`);
  console.log(
    missing.length
      ? `\n${missing.length} of ${missing.length + skipped.length} notebook(s) have no wrapper page`
      : `\nall ${skipped.length} notebook(s) have a wrapper page`,
  );
  process.exit(missing.length ? 1 : 0);
}

console.log(
  `\nwrote ${written} wrapper page(s); left ${skipped.length} existing alone` +
    (force ? '' : ' (--force to overwrite)'),
);
