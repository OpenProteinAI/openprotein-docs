import 'server-only';
import { cache } from 'react';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SPEC_DIR = path.join(process.cwd(), 'specs');

/** Sphinx roles: `~dotted.path`, `dotted.path`, or `label <dotted.path>`. */
const ROLE =
  /:(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data):`\s*(?:([^<`]+?)\s*<([^>`]+)>|~?([^`]+?))\s*`/g;

/** Dotted path -> page, from the `page` field the specs already carry. */
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

/** All 35 roles are pandoc raw-inline: `` `` :py:class:`X` ``{=rst} ``. Unwrap the span too,
 *  or the code span and the `{=rst}` reach the reader. */
const RAW_INLINE = /``[ ]?([\s\S]*?)[ ]?``\{=rst\}/g;

/** Stateless copy: `.test()` on the global ROLE would advance its lastIndex. */
const HAS_ROLE = new RegExp(ROLE.source);

/** nbsphinx resolved these; plain remark does not. Unresolvable targets stay code spans. */
export async function rewriteRstRoles(source: string): Promise<string> {
  if (!source.includes(':`') && !source.includes('{=rst}')) return source;
  const pages = await index();

  const resolve = (text: string) =>
    text.replace(ROLE, (_whole, label, target, bare) => {
      const dotted = (target ?? bare ?? '').trim();
      const shown = (label ?? dotted.split('.').pop() ?? dotted).trim();
      const page = pages.get(dotted);
      if (!page) return `\`${shown}\``;
      return `[\`${shown}\`](/python-api/api-reference/${page}#${dotted})`;
    });

  // Newlines collapse so a link never straddles a hard break.
  return resolve(
    source.replace(RAW_INLINE, (whole, inner: string) => {
      const flat = inner.replace(/\s+/g, ' ').trim();
      return HAS_ROLE.test(flat) ? resolve(flat) : `\`${flat}\``;
    }),
  );
}
