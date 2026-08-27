/**
 * Compile .mdx files and report syntax errors, in seconds rather than a whole `next build`.
 * Catches raw HTML that MDX reads as JSX. Does not check components or props — the build does.
 *
 *   node scripts/check-mdx.mjs [content/docs/a.mdx …]
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
  // Frontmatter is not MDX.
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
