/** Asserts the brand token contrasts in app/global.css. */
import { readFile } from 'node:fs/promises';

const AA = 4.5;

function lum(hex) {
  const n = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const css = await readFile(new URL('../app/global.css', import.meta.url), 'utf8');

function block(selector, index = 0) {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g');
  const found = [...css.matchAll(re)];
  const body = found[index]?.[1] ?? '';
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]),
  );
}

const light = block(':root');
const dark = { ...light, ...block('\\.dark') };

const LIGHT_BG = '#ffffff';
const DARK_BG = '#212529';

const checks = [
  ...['--brand-1-ink', '--brand-2-ink', '--brand-3-ink'].flatMap((token) => [
    { label: `${token} on light`, fg: light[token], bg: LIGHT_BG },
    { label: `${token} on dark`, fg: dark[token], bg: DARK_BG },
  ]),
  { label: 'white on --brand-1-fill', fg: '#ffffff', bg: light['--brand-1-fill'] },
  { label: 'white on --brand-2-fill', fg: '#ffffff', bg: light['--brand-2-fill'] },
  { label: 'black on --brand-3-fill', fg: '#000000', bg: light['--brand-3-fill'] },
];

let failed = 0;
for (const { label, fg, bg } of checks) {
  if (!fg || !bg) {
    console.error(`?? ${label}: token not found in app/global.css`);
    failed++;
    continue;
  }
  const ratio = contrast(fg, bg);
  const ok = ratio >= AA;
  if (!ok) failed++;
  console.log(`${ok ? 'ok' : 'FAIL'}  ${label.padEnd(28)} ${fg} on ${bg}  ${ratio.toFixed(2)}:1`);
}

if (failed) {
  console.error(`\n${failed} contrast check(s) below ${AA}:1`);
  process.exit(1);
}
console.log(`\nall ${checks.length} checks >= ${AA}:1`);
