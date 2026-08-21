/**
 * Compile one or more .mdx files and report syntax errors, without a full `next build`.
 *
 * `pnpm build` is the only authority on whether a page renders, but it is minutes long and
 * global — useless for iterating on one page, and impossible to run concurrently. This runs the
 * MDX compiler alone, which is what catches the class of failure the RST conversion produces:
 * raw HTML that MDX reads as JSX (`<div>` without a close, `<img>` unterminated, a stray `/`).
 *
 *   node scripts/check-mdx.mjs                       # every page under content/docs
 *   node scripts/check-mdx.mjs content/docs/a.mdx …  # just these
 *
 * It does NOT check that a component exists or that props typecheck — `pnpm build` does that.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.mdx') ? [full] : [];
  });

const files = process.argv.slice(2).length ? process.argv.slice(2) : walk('content/docs').sort();
let failed = 0;

for (const file of files) {
  // Frontmatter is not MDX; fumadocs strips it before compiling and so must we.
  const raw = readFileSync(file, 'utf8');
  const body = raw.startsWith('---') ? raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') : raw;
  try {
    await compile(body, { remarkPlugins: [remarkGfm], development: false });
  } catch (error) {
    failed++;
    const at = error.line ? `:${error.line}:${error.column ?? 1}` : '';
    console.log(`  FAIL ${file}${at}\n       ${error.reason ?? error.message}`);
  }
}

console.log(
  failed
    ? `\n${failed} of ${files.length} page(s) do not compile as MDX`
    : `\nall ${files.length} page(s) compile as MDX`,
);
process.exit(failed ? 1 : 0);
