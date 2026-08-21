import { renderMarkdown } from '@/lib/markdown';
import { rewriteRstRoles } from '@/lib/rst-roles';
import { readNotebook } from '@/lib/notebook';
import { CodeCell } from './code-cell';

/** Cell 0 of 8 notebooks links three badge SVGs at the old source/ tree; <NotebookBadges> replaces them. */
const STALE_BADGE = /^\[!\[[^\]]*\]\([^)]*_static\/[a-z-]*badge\.svg\)\]\([^)]*\)[ \t]*$/gm;

export async function NotebookView({
  file,
  headingShift = 0,
}: {
  file: string;
  headingShift?: number;
}) {
  const notebook = await readNotebook(file);
  // One pass up front so the cells render in order without awaiting inside the map.
  const prose = await Promise.all(
    notebook.cells.map(async (cell) =>
      cell.kind === 'markdown'
        ? renderMarkdown(
            // Notebook markdown cells carry Sphinx cross-reference roles, which nbsphinx
            // resolved because the whole site was one Sphinx project.
            await rewriteRstRoles(cell.source.replace(STALE_BADGE, '').trimStart()),
            { headingShift, nbsphinxAliases: true },
          )
        : null,
    ),
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
