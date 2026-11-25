import {
  bundledLanguages,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from 'shiki';
import type { Element } from 'hast';
import { buildMarkdown, type Highlight } from './markdown-core';
import { texToHast } from './mathjax';

/** fumadocs-core's own pair, so .dark drives both via --shiki-light/--shiki-dark. */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

function isBundled(lang: string): lang is BundledLanguage {
  return lang in bundledLanguages;
}

let highlighting: Promise<Highlighter> | undefined;

/** One highlighter per process: loading grammars per request would dominate render time. */
function getHighlighter(): Promise<Highlighter> {
  highlighting ??= createHighlighter({ themes: [THEMES.light, THEMES.dark], langs: ['python'] });
  return highlighting;
}

/** Unlabelled and unknown fences fall back to plaintext so every code block gets the same chrome. */
const highlight: Highlight = async (code, lang) => {
  const shiki = await getHighlighter();
  const name = isBundled(lang) ? lang : 'text';
  if (name !== 'text' && !shiki.getLoadedLanguages().includes(name)) await shiki.loadLanguage(name);
  const root = shiki.codeToHast(code, { lang: name, themes: THEMES, defaultColor: false });
  return (root.children.find((child) => child.type === 'element') as Element | undefined) ?? null;
};

/** Assembling a pipeline is not free and notebook pages render one per request. */
const processors = new Map<string, ReturnType<typeof buildMarkdown>>();

export async function renderMarkdown(
  source: string,
  options?: {
    headingShift?: number;
    /** Also emit the id nbsphinx used, so old notebook deep links still land. Notebook cells
     *  only — a Python docstring never had an nbsphinx anchor. */
    nbsphinxAliases?: boolean;
    /** TeX errors throw. */
    math?: boolean;
  },
): Promise<string> {
  const headingShift = options?.headingShift ?? 0;
  const nbAliases = options?.nbsphinxAliases ?? false;
  const math = options?.math ?? false;
  const key = `${headingShift}:${nbAliases}:${math}`;
  let processor = processors.get(key);
  if (!processor) {
    processor = buildMarkdown(highlight, headingShift, nbAliases, math ? { load: async () => texToHast } : undefined);
    processors.set(key, processor);
  }
  return String(await processor.process(source));
}
