import Slugger from 'github-slugger';
import { renderMarkdown } from '@/lib/markdown';
import { rewriteRstRoles } from '@/lib/rst-roles';
import { readNotebook } from '@/lib/notebook';
import { STALE_BADGE } from '@/lib/notebook-parse';
import { CodeCell } from './code-cell';

/** A markdown cell as HTML; the page and the editor's preview share it. */
export async function renderCellProse(source: string, headingShift = 0): Promise<string> {
  return renderMarkdown(
    // Notebook markdown cells carry Sphinx cross-reference roles, which nbsphinx
    // resolved because the whole site was one Sphinx project.
    await rewriteRstRoles(source.replace(STALE_BADGE, '').trimStart()),
    { headingShift, nbsphinxAliases: true, math: true },
  );
}

export async function NotebookView({
  file,
  headingShift = 0,
  untitled = false,
}: {
  file: string;
  headingShift?: number;
  /** Drops the notebook's own `#` title, for a page that prints its title. */
  untitled?: boolean;
}) {
  const notebook = await readNotebook(file);
  const titleCell = untitled ? notebook.cells.findIndex((cell) => cell.kind === 'markdown') : -1;
  // One pass up front so the cells render in order without awaiting inside the map.
  const rendered = await Promise.all(
    notebook.cells.map(async (cell, index) => {
      if (cell.kind !== 'markdown') return null;
      const source = index === titleCell ? cell.source.replace(/^\s*#\s[^\n]*\n?/, '') : cell.source;
      return renderCellProse(source, headingShift);
    }),
  );
  // Cells slug alone; repeats across cells get -1, -2 as the TOC expects.
  const slugger = new Slugger();
  const prose = rendered.map((html) =>
    html?.replace(/(<h[1-6]\b[^>]*?\sid=")([^"]+)"/g, (_, open, id) => `${open}${slugger.slug(id)}"`),
  );

  // Embeds are addressed by their position across the whole notebook, matching the route.
  let embedsBefore = 0;
  const firstEmbed = notebook.cells.map((cell) => {
    const at = embedsBefore;
    if (cell.kind === 'code') embedsBefore += cell.outputs.filter((o) => o.kind === 'embed').length;
    return at;
  });

  return (
    <div className="nb-body not-prose">
      {notebook.cells.map((cell, index) =>
        cell.kind === 'markdown' ? (
          prose[index] ? (
            <div
              key={index}
              className="prose-no-margin my-5"
              dangerouslySetInnerHTML={{ __html: prose[index] }}
            />
          ) : null
        ) : (
          <CodeCell
            key={index}
            cell={cell}
            language={notebook.language}
            file={file}
            firstEmbed={firstEmbed[index]}
          />
        ),
      )}
    </div>
  );
}
