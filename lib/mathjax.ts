import type { Element, ElementContent } from 'hast';
import { h, s } from 'hastscript';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import type { LiteElement, LiteNode } from '@mathjax/src/js/adaptors/lite/Element.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { AssistiveMmlHandler } from '@mathjax/src/js/a11y/assistive-mml.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';

// Never html, require, autoload or texhtml: shared links.
export const TEX_PACKAGES = ['base', 'ams', 'boldsymbol'];

// Static imports: same-origin chunks for the CSP.
const FONT_RANGES: Record<string, () => Promise<unknown>> = {
  PUA: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/PUA.js'),
  accents: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/accents.js'),
  'accents-b-i': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/accents-b-i.js'),
  arabic: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/arabic.js'),
  arrows: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/arrows.js'),
  braille: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/braille.js'),
  'braille-d': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/braille-d.js'),
  calligraphic: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/calligraphic.js'),
  cherokee: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/cherokee.js'),
  cyrillic: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/cyrillic.js'),
  'cyrillic-ss': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/cyrillic-ss.js'),
  devanagari: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/devanagari.js'),
  'double-struck': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/double-struck.js'),
  fraktur: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/fraktur.js'),
  greek: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/greek.js'),
  'greek-ss': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/greek-ss.js'),
  hebrew: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/hebrew.js'),
  latin: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/latin.js'),
  'latin-b': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-b.js'),
  'latin-bi': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-bi.js'),
  'latin-i': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-i.js'),
  marrows: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/marrows.js'),
  math: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/math.js'),
  monospace: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace.js'),
  'monospace-ex': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace-ex.js'),
  'monospace-l': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace-l.js'),
  mshapes: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/mshapes.js'),
  phonetics: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/phonetics.js'),
  'phonetics-ss': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/phonetics-ss.js'),
  'sans-serif': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif.js'),
  'sans-serif-b': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-b.js'),
  'sans-serif-bi': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-bi.js'),
  'sans-serif-ex': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-ex.js'),
  'sans-serif-i': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-i.js'),
  'sans-serif-r': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-r.js'),
  script: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/script.js'),
  shapes: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/shapes.js'),
  symbols: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/symbols.js'),
  'symbols-b-i': () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/symbols-b-i.js'),
  variants: () => import('@mathjax/mathjax-newcm-font/js/svg/dynamic/variants.js'),
};

mathjax.asyncLoad = (name: string) => {
  const range = /\/svg\/dynamic\/([\w-]+)\.js$/.exec(name)?.[1];
  const load = range ? FONT_RANGES[range] : undefined;
  return load ? load() : Promise.reject(new Error(`MathJax: no font range for ${name}`));
};

const adaptor = liteAdaptor();
AssistiveMmlHandler(RegisterHTMLHandler(adaptor));

let failure: string | null = null;
const tex = new TeX({
  packages: TEX_PACKAGES,
  formatError: (jax: TeX<unknown, unknown, unknown>, error: Error) => {
    failure = error.message;
    return jax.formatError(error as never);
  },
});
const svg = new SVG({ fontCache: 'none', displayOverflow: 'scroll' });
const document = mathjax.document('', { InputJax: tex, OutputJax: svg });

const DROPPED = new Set(['data-latex', 'data-c']);

function toHast(node: LiteNode, inSvg: boolean): ElementContent {
  if (adaptor.kind(node) === '#text') return { type: 'text', value: adaptor.value(node) };
  const element = node as LiteElement;
  const kind = adaptor.kind(element);
  const svgSpace = inSvg || kind === 'svg';
  const props: Record<string, string> = {};
  for (const { name, value } of adaptor.allAttributes(element)) if (!DROPPED.has(name)) props[name] = value;
  const children = adaptor.childNodes(element).map((child) => toHast(child, svgSpace));
  return (svgSpace ? s : h)(kind, props, children);
}

export interface TexResult {
  /** Holds an merror when the TeX failed. */
  node: Element;
  error: string | null;
}

let queue: Promise<unknown> = Promise.resolve();

/** One at a time: `failure` is shared. */
export function texToHast(source: string, display: boolean): Promise<TexResult> {
  const run = queue.then(async () => {
    failure = null;
    const container = (await document.convertPromise(source, { display })) as LiteElement;
    const node = toHast(container, false) as Element;
    // For Copy as TeX.
    node.properties.dataTex = source.trim();
    return { node, error: failure };
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Static: the same for any equation. */
export function mathStyleSheet(): string {
  return adaptor.textContent(svg.styleSheet(document) as LiteElement);
}
