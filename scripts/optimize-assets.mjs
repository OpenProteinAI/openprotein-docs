import { execFile } from 'node:child_process';
import { readdir, rm, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = new URL('../public/_static/', import.meta.url).pathname;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (extname(e.name).toLowerCase() === '.gif') out.push(p);
  }
  return out;
}

const mtime = async (p) => (await stat(p).catch(() => null))?.mtimeMs ?? -1;
const size = async (p) => (await stat(p).catch(() => null))?.size ?? 0;
const mb = (n) => (n / 1048576).toFixed(1).padStart(6) + ' MB';

try {
  await run('gif2webp', ['-version']);
} catch {
  console.error('gif2webp not found on PATH. Install libwebp (brew install webp).');
  process.exit(1);
}

// Below this, the webp is not worth carrying a second copy of the asset for.
const MIN_SAVING = 0.15;

const gifs = (await walk(ROOT)).sort();
if (gifs.length === 0) {
  console.log('no GIFs found under public/_static');
  process.exit(0);
}

let gifTotal = 0;
let webpTotal = 0;
let converted = 0;

for (const gif of gifs) {
  const webp = gif.replace(/\.gif$/i, '.webp');
  const g = await size(gif);
  gifTotal += g;

  if ((await mtime(webp)) > (await mtime(gif))) {
    const w = await size(webp);
    webpTotal += w;
    console.log(`skip  ${mb(g)} -> ${mb(w)}  ${gif.slice(ROOT.length)}`);
    continue;
  }


  // -lossy -q 70: these are screen recordings, so lossy artefacts are invisible.
  try {
    await run('gif2webp', ['-lossy', '-q', '70', '-m', '4', '-mt', gif, '-o', webp]);
  } catch (error) {
    console.error(`FAIL  ${gif.slice(ROOT.length)}: ${error.message}`);
    process.exit(1);
  }

  const w = await size(webp);
  const saved = 1 - w / g;

  if (saved < MIN_SAVING) {
    await rm(webp, { force: true });
    webpTotal += g;
    console.log(`drop  ${mb(g)} -> ${mb(w)}  ${(saved * 100).toFixed(0).padStart(3)}% saved, below ${MIN_SAVING * 100}% - webp removed  ${gif.slice(ROOT.length)}`);
    continue;
  }

  webpTotal += w;
  converted++;
  console.log(`ok    ${mb(g)} -> ${mb(w)}  ${(saved * 100).toFixed(0).padStart(3)}% saved  ${gif.slice(ROOT.length)}`);
}

console.log(
  `\n${gifs.length} GIFs (${converted} converted): ${mb(gifTotal)} -> ${mb(webpTotal)}, ` +
    `${(100 - (webpTotal / gifTotal) * 100).toFixed(0)}% saved. Originals kept for URL compatibility.`,
);
