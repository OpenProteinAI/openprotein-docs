// Prints `<key>\t<target>` for each old Sphinx URL, resolved by proxy.server.ts, for S3 redirect objects.
// Usage: node scripts/s3-redirects.mjs [out]
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server.js';

const root = fileURLToPath(new URL('..', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') return nextResolve('next/server.js', context);
    if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(`${root}${specifier.slice(2)}.ts`).href, context);
    return nextResolve(specifier, context);
  },
});
const { default: proxy } = await import('../proxy.server.ts');

const out = process.argv[2] ?? 'out';
const paths = JSON.parse(readFileSync(new URL('./legacy-sphinx-urls.json', import.meta.url), 'utf8'));
const missing = [];

for (const path of paths) {
  const key = path.slice(1);
  // The new site serves it.
  if (existsSync(`${out}/${key}`)) continue;

  const response = proxy(new NextRequest(`https://docs.openprotein.ai${path}`));
  const location = response.headers.get('location');
  if (response.status !== 301 || !location) {
    missing.push(`${path} (no redirect)`);
    continue;
  }
  // Folder URLs, as the static export writes them.
  const to = new URL(location).pathname.replace(/\/?$/, '/');
  if (!existsSync(`${out}${to}index.html`)) {
    missing.push(`${path} -> ${to} (no page)`);
    continue;
  }
  console.log(`${key}\t${to}`);
}

if (missing.length) {
  console.error(`s3-redirects: ${missing.length} old URL(s) have no target:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
