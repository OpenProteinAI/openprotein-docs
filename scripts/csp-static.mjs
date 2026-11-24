/**
 * Pins every inline script of the static export in a per-page CSP <meta>, so a page runs Next's
 * own inline scripts, same-origin files and Google Analytics if set, and nothing injected later.
 * No-op for the server build.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import './load-env.mjs';

if (process.env.BUILD_TARGET !== 'static') process.exit(0);

const INLINE = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const GA = process.env.NEXT_PUBLIC_OP_GA_ID ? 'https://www.googletagmanager.com' : '';

// Mol* viewers load their script from a CDN and run in a sandboxed iframe, which is their isolation.
const VIEWERS = path.resolve('out', 'api', 'notebook-embed');

async function* pages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (file === VIEWERS) continue;
    if (entry.isDirectory()) yield* pages(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}

let pinned = 0;
for await (const file of pages(path.resolve('out'))) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('<head>')) throw new Error(`csp: no <head> to pin a policy in ${file}`);
  const hashes = new Set();
  for (const [, body] of html.matchAll(INLINE)) {
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
  const policy = [`script-src 'self' ${[...hashes].join(' ')} ${GA}`.replace(/\s+/g, ' ').trim(), "object-src 'none'", "base-uri 'self'"].join('; ');
  await writeFile(file, html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"/>`));
  pinned += 1;
}
console.log(`csp: pinned inline scripts on ${pinned} pages`);
