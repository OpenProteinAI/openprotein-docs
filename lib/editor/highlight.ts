import type { HighlighterCore } from 'shiki/core';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { createRehypeCode, rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code.core';

let highlighter: Promise<HighlighterCore> | null = null;

/** The docs' themes; JS regex engine, since the CSP has no wasm-unsafe-eval. */
export function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: [
      import('shiki/langs/python.mjs'),
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/shellscript.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/yaml.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/tsx.mjs'),
      import('shiki/langs/javascript.mjs'),
      import('shiki/langs/jsx.mjs'),
    ],
  });
  return highlighter;
}

export const rehypeCodePreview = createRehypeCode(async () => ({
  highlighter: await getHighlighter(),
  options: { ...rehypeCodeDefaultOptions(), lazy: false, langs: [], fallbackLanguage: 'plaintext' },
}));
