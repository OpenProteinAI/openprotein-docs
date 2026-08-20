import 'server-only';

import { renderMarkdown } from './markdown';

/**
 * Docstring prose is RST, not markdown, but only in three ways that matter across this SDK's
 * 492 docstrings — so it goes through the markdown pipeline after a small normalising pass
 * rather than pulling in a second renderer.
 */

/** `:py:class:`~openprotein.fold.FoldAPI`` and friends. 30 occurrences in the whole SDK. */
const ROLE = /:(?:py:)?(class|meth|func|attr|obj|mod|exc|data)::?`([^`]+)`/g;

/** RST literal `` ``x`` `` is markdown `` `x` ``; a single-backtick RST span is emphasis. */
const DOUBLE_BACKTICK = /``([^`]+)``/g;

/** `.. note::` / `.. warning::` blocks that napoleon did not already lift into a section. */
const DIRECTIVE = /^\s*\.\.\s+(note|warning|tip|important|caution|seealso)::\s*$/gim;

function role(_match: string, _kind: string, target: string): string {
  // `~` means "show the last component only", which is how the old pages read.
  const short = target.startsWith('~');
  const dotted = short ? target.slice(1) : target;
  const label = short ? (dotted.split('.').pop() ?? dotted) : dotted;
  // Same-page anchor when it is a documented dotted path; the reference pages all use the
  // dotted path verbatim as the element id, so this resolves across pages via the browser.
  return dotted.startsWith('openprotein.') ? `[\`${label}\`](#${dotted})` : `\`${label}\``;
}

export function normaliseDocstring(text: string): string {
  return text
    .replace(ROLE, role)
    .replace(DOUBLE_BACKTICK, (_m, inner: string) => `\`${inner}\``)
    .replace(DIRECTIVE, (_m, kind: string) => `**${kind[0].toUpperCase()}${kind.slice(1)}:**`);
}

/** Docstring prose as HTML. `headingShift` keeps any docstring heading below the member's. */
export async function renderDocstring(text: string, headingShift = 4): Promise<string> {
  return renderMarkdown(normaliseDocstring(text), { headingShift });
}
