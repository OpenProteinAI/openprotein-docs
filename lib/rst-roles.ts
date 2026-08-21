import 'server-only';
import { cache } from 'react';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SPEC_DIR = path.join(process.cwd(), 'specs');

/**
 * Sphinx cross-reference roles, in the three spellings this corpus uses:
 *   :py:class:`~openprotein.molecules.Complex`          — tilde: label is the last component
 *   :py:meth:`openprotein.jobs.Future.wait`             — bare: label is the last component
 *   :py:meth:`session.align.create_msa <openprotein.align.AlignAPI.create_msa>`  — explicit label
 */
const ROLE =
  /:(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data):`\s*(?:([^<`]+?)\s*<([^>`]+)>|~?([^`]+?))\s*`/g;

/**
 * Every dotted path the Python API reference publishes, mapped to its page.
 *
 * Built from `specs/*.json` rather than duplicating the generator's resolver: the specs already
 * carry a `page` per entry, which is what makes a cross-page link resolvable. Both spellings of
 * a path are registered — the canonical one and the public one — because a docstring may use
 * either.
 */
const index = cache(async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  let files: string[];
  try {
    files = (await readdir(SPEC_DIR)).filter(
      (name) => name.startsWith('openprotein') && name.endsWith('.json'),
    );
  } catch {
    return map;
  }
  for (const name of files) {
    const document = JSON.parse(await readFile(path.join(SPEC_DIR, name), 'utf8'));
    for (const entry of document.entries ?? []) {
      if (entry.summary_only || !entry.page) continue;
      map.set(entry.path, entry.page);
      for (const member of entry.members ?? []) {
        map.set(`${entry.path}.${member.name}`, entry.page);
      }
    }
  }
  return map;
});

/**
 * Rewrite Sphinx roles in notebook markdown to real links.
 *
 * Notebook authors wrote `:py:class:`~openprotein.molecules.Complex`` in markdown cells, which
 * nbsphinx resolved because the whole site was one Sphinx project. Here the notebook body goes
 * through plain remark, so 35 roles across 3 notebooks were rendering as literal
 * `:py:class:`…`` text — caught by `pnpm check:content`.
 *
 * An unresolvable target becomes a code span, which is what Sphinx did with the ones it could
 * not resolve either. A *wrong* link is worse than none.
 */
export async function rewriteRstRoles(source: string): Promise<string> {
  if (!source.includes(':`')) return source;
  const pages = await index();
  return source.replace(ROLE, (whole, label, target, bare) => {
    const dotted = (target ?? bare ?? '').trim();
    const text = (label ?? dotted.split('.').pop() ?? dotted).trim();
    const page = pages.get(dotted);
    if (!page) return `\`${text}\``;
    return `[\`${text}\`](/python-api/api-reference/${page}#${dotted})`;
  });
}
