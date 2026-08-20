import Link from 'next/link';
import { readPySummary } from '@/lib/python-api';

/**
 * One `.. autosummary::` table: a linked dotted path with its abbreviated signature, and the
 * docstring's first sentence. Replaces the 15 tables on the api-reference index.
 */
export async function PySummary({ paths }: { paths: string[] }) {
  const rows = await readPySummary(paths);

  return (
    <div className="not-prose my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.path} className="border-t border-fd-border first:border-t-0">
              <td className="w-1/2 py-2 pe-4 align-top">
                {row.page ? (
                  <Link
                    href={`/python-api/api-reference/${row.page}#${row.path}`}
                    className="font-mono text-sm text-fd-primary underline-offset-4 hover:underline"
                  >
                    {row.path}
                  </Link>
                ) : (
                  /* Three objects the .rst summarises but never documents with an autoclass
                     directive, so there is no anchor to link to. Sphinx dropped these rows
                     entirely; showing them unlinked is strictly more informative. */
                  <span className="font-mono text-sm text-fd-foreground">{row.path}</span>
                )}
                <span className="font-mono text-xs text-fd-muted-foreground">{row.signature}</span>
              </td>
              <td className="py-2 align-top text-fd-muted-foreground">{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
