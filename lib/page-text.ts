import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readNotebook } from '@/lib/notebook';
import { readPyEntry } from '@/lib/python-api';
import { getSpecDocument, REST_API_PAGES } from '@/lib/openapi';
import { listOperations } from '@/lib/openapi-endpoints';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');
const PY_ENTRY = /<Py(?:Class|Function)\s+path=["']([^"']+)["']/g;

type AnyPage = {
  path: string;
  url: string;
  data: {
    title?: string;
    description?: string;
    notebook?: string;
    openapi?: string;
    pythonApi?: boolean;
    getText?: (kind: 'processed' | 'raw') => Promise<string>;
  };
};

/**
 * Everything a reader can see on a page, as plain-ish markdown.
 *
 * The MDX body is only part of it: notebook, Python API and REST pages render their bodies at
 * request time, so `getText('processed')` returns a wrapper with almost nothing in it. Search and
 * `llms-full.txt` both need the whole thing, so they share this.
 */
export const pageText = cache(async (page: AnyPage): Promise<string> => {
  const parts: string[] = [];
  if (page.data.getText) {
    try {
      parts.push(await page.data.getText('processed'));
    } catch {
      // openapi pages have no MDX text of their own.
    }
  }
  const generated = await generatedText(page);
  if (generated) parts.push(generated);
  return parts.join('\n\n').trim();
});

/** The request-time body: notebook prose, Python API members, or REST operations. */
async function generatedText(page: AnyPage): Promise<string> {
  if (page.data.notebook) return notebookText(page.data.notebook);
  if (page.data.pythonApi) return pythonText(page.path);
  if (page.data.openapi) return restText(page.url);
  return '';
}

async function notebookText(file: string): Promise<string> {
  let notebook;
  try {
    notebook = await readNotebook(file);
  } catch {
    return '';
  }
  return notebook.cells
    .map((cell) => (cell.kind === 'markdown' ? cell.source : `\`\`\`\n${cell.source}\n\`\`\``))
    .join('\n\n');
}

async function pythonText(pagePath: string): Promise<string> {
  let raw: string;
  try {
    raw = await readFile(path.join(CONTENT_DIR, pagePath), 'utf8');
  } catch {
    return '';
  }
  const out: string[] = [];
  for (const match of raw.matchAll(PY_ENTRY)) {
    const dotted = match[1];
    try {
      const { entry } = await readPyEntry(dotted);
      out.push(`## ${dotted}${entry.signature ?? ''}`);
      if (entry.doc) out.push(entry.doc);
      for (const member of entry.members ?? []) {
        out.push(`### ${dotted}.${member.name}`);
        if (member.doc) out.push(member.doc);
      }
    } catch {
      // A path that no longer resolves is the render check's problem, not search's.
    }
  }
  return out.join('\n\n');
}

async function restText(url: string): Promise<string> {
  const id = REST_API_PAGES.find((page) => url.endsWith(`/${page.slug}`))?.id;
  if (!id) return '';
  let document;
  try {
    document = await getSpecDocument(id);
  } catch {
    return '';
  }
  return listOperations(document)
    .map(({ path: route, method }) => {
      const operation = (document.paths?.[route] as Record<string, { summary?: string; description?: string }>)?.[method];
      return [
        `## ${method.toUpperCase()} ${route}`,
        operation?.summary,
        operation?.description,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
