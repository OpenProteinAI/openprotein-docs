import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readNotebook } from '@/lib/notebook';
import { readPyEntry, readPySummary, pyMemberValue, sharedTaskMembers, type PySection, type TypePart, type PyOverloadContract } from '@/lib/python-api';
import { normaliseDocstring } from '@/lib/python-doc';
import { getSpecDocument, REST_API_PAGES } from '@/lib/openapi';
import { endpointOperation, listOperations } from '@/lib/openapi-endpoints';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

const escape = (text: string) => text.replace(/[\\`*_[\]<>#]/g, '\\$&');

/** Search pins a heading to the page's own anchor; slugging its text would miss. */
const heading = (anchored: boolean, depth: number, text: string, id: string) =>
  anchored ? `${'#'.repeat(depth)} ${escape(text)} [#${escape(id)}]` : `${'#'.repeat(depth)} ${text}`;

/** Headings inside a docstring or description would be anchors the page doesn't have. */
const unhead = (anchored: boolean, doc: string) =>
  anchored ? doc.replace(/^[ \t]*[-=]{3,}[ \t]*$/gm, '').replace(/^ {0,3}#{1,6}[ \t]+/gm, '') : doc;

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
 * request time, so `getText('processed')` returns a wrapper with almost nothing in it.
 * `llms-full.txt` and the Markdown routes need the whole thing.
 */
export const pageText = cache((page: AnyPage) => text(page));

/** The request-time body with headings that link to the page's real anchors, for search. */
export const generatedSearchText = cache((page: AnyPage) => generatedText(page, true));

async function text(page: AnyPage): Promise<string> {
  const parts: string[] = [];
  let processed: string | undefined;
  if (page.data.getText) {
    try {
      processed = await page.data.getText('processed');
    } catch {
      // openapi pages have no MDX text of their own.
    }
  }
  if (processed !== undefined) {
    parts.push(page.data.pythonApi ? await expandPythonComponents(page.path, processed) : processed);
  }
  const generated = page.data.pythonApi
    ? processed === undefined ? await pythonText(page.path, false) : ''
    : await generatedText(page, false);
  if (generated) parts.push(generated);
  return parts.join('\n\n').trim();
}

/** The request-time body: notebook prose, Python API members, or REST operations. */
async function generatedText(page: AnyPage, anchored: boolean): Promise<string> {
  if (page.data.notebook) return notebookText(page.data.notebook);
  if (page.data.pythonApi) return pythonText(page.path, anchored);
  if (page.data.openapi) return restText(page.url, anchored);
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

export function codeSpan(text: string): string {
  const delimiter = '`'.repeat(Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length)) + 1);
  const padded = /^`|`$|^ .* $/.test(text) ? ` ${text} ` : text;
  return `${delimiter}${padded}${delimiter}`;
}

function typeMarkdown(parts?: TypePart[] | null, fallback?: string | null, prefix = ''): string {
  const tokens = parts?.length ? parts : fallback ? [{ text: fallback }] : [];
  let plain = prefix;
  let result = '';
  for (const part of tokens) {
    if (part.page && part.path) {
      if (plain) result += codeSpan(plain);
      result += `[${codeSpan(part.text)}](/references/python-api/${part.page}#${part.path})`;
      plain = '';
    } else plain += part.text;
  }
  return result + (plain ? codeSpan(plain) : '');
}

function contracts(name: string, overloads?: PyOverloadContract[]): string[] {
  return (overloads ?? []).map((o) => `- ${typeMarkdown(o.signature_parts, o.signature, name)}${o.returns ? ` → ${typeMarkdown(o.returns_parts, o.returns)}` : ''}`);
}

function sectionText(sections: PySection[] | undefined, doc: string | null, anchored: boolean, skipAttributes = false): string[] {
  if (!sections?.length) return doc ? [normaliseDocstring(unhead(anchored, doc))] : [];
  const out: string[] = [];
  if (doc && sections.every((section) => section.kind === 'parameters' && section.items.every((item) => item.annotation_fallback))) {
    out.push(normaliseDocstring(unhead(anchored, doc)));
  }
  for (const section of sections) {
    if (section.kind === 'text') out.push(normaliseDocstring(unhead(anchored, section.text)));
    else if (section.kind === 'admonition') out.push(`**${section.title ?? 'Note'}**\n\n${normaliseDocstring(section.text)}`);
    else if (section.kind === 'examples') out.push(...section.items.map(normaliseDocstring));
    else if (!(skipAttributes && section.kind === 'attributes')) {
      out.push(`**${section.kind[0].toUpperCase() + section.kind.slice(1)}**`);
      for (const item of section.items) {
        out.push(`- ${item.name ? `\`${item.name}\` ` : ''}${typeMarkdown(item.type_parts, item.type)}${item.default ? ` = \`${item.default}\`` : ''}${item.text ? ` — ${normaliseDocstring(item.text)}` : ''}`);
      }
    }
  }
  return out;
}

const PY_SUMMARY = /<PySummary\s+paths=\{\[([\s\S]*?)\]\}\s*\/>/g;

async function summaryText(paths: string[]): Promise<string> {
  return (await readPySummary(paths)).map((row) => {
    const label = row.page ? `[\`${row.path}\`](/references/python-api/${row.page}#${row.path})` : `\`${row.path}\``;
    return `- ${label}\`${row.signature}\` — ${row.summary}`;
  }).join('\n');
}

type PyDirective = { kind: string; start: number; end: number; source: string };

function directives(text: string): PyDirective[] {
  let fence = '';
  const masked = text.replace(/^.*(?:\n|$)/gm, (line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line)) fence = '';
      return line.replace(/[^\n]/g, ' ');
    }
    if (marker) { fence = marker[1]; return line.replace(/[^\n]/g, ' '); }
    return line;
  });
  const pattern = /<\/?Py(?:Group|Class|Function|Summary)\b[^>]*>/g;
  return Array.from(masked.matchAll(pattern), (match) => ({
    kind: match[0].match(/^<\/?(Py\w+)/)![1] + (match[0].startsWith('</') ? '/' : ''),
    start: match.index!, end: match.index! + match[0].length,
    source: text.slice(match.index!, match.index! + match[0].length),
  }));
}

async function expandPythonComponents(pagePath: string, processed: string): Promise<string> {
  const raw = await readFile(path.join(CONTENT_DIR, pagePath), 'utf8');
  const source = directives(raw);
  const target = directives(processed);
  if (source.length !== target.length || source.some((item, i) => item.kind !== target[i].kind)) {
    throw new Error(`Python component count mismatch in ${pagePath}`);
  }
  const groupLevels: number[] = [];
  const entryDepths = source.map((item) => {
    if (item.kind === 'PyGroup') groupLevels.push(/\blevel=\{3\}/.test(item.source) ? 3 : 2);
    else if (item.kind === 'PyGroup/') groupLevels.pop();
    return (groupLevels.at(-1) ?? 2) + 1;
  });
  const replacements = await Promise.all(source.map(async (item, index) => {
    if (item.kind === 'PyGroup/') return '';
    if (item.kind === 'PyGroup') {
      const id = item.source.match(/\bid=["']([^"']+)["']/)?.[1];
      const title = item.source.match(/\btitle=["']([^"']+)["']/)?.[1];
      if (!id || !title) throw new Error(`Invalid PyGroup in ${pagePath}`);
      return `<a id="${id}"></a>\n\n${heading(false, entryDepths[index] - 1, title, id)}`;
    }
    if (item.kind === 'PySummary') {
      const paths = item.source.match(/\bpaths=\{\[([\s\S]*?)\]\}/)?.[1];
      if (paths === undefined) throw new Error(`Invalid PySummary in ${pagePath}`);
      return summaryText(Array.from(paths.matchAll(/["']([^"']+)["']/g), (match) => match[1]));
    }
    const dotted = item.source.match(/\bpath=["']([^"']+)["']/)?.[1];
    if (!dotted) throw new Error(`Invalid ${item.kind} in ${pagePath}`);
    return entryText(dotted, false, entryDepths[index]);
  }));
  let result = ''; let cursor = 0;
  target.forEach((item, i) => { result += processed.slice(cursor, item.start) + replacements[i]; cursor = item.end; });
  return result + processed.slice(cursor);
}

async function entryText(dotted: string, anchored: boolean, depth: number): Promise<string> {
  const out: string[] = [];
  const { entry, document } = await readPyEntry(dotted);
  const shared = anchored ? new Map<string, string>() : sharedTaskMembers(entry, document);
  if (!anchored) out.push(`<a id="${dotted}"></a>`);
  out.push(heading(anchored, depth, `${dotted}${entry.display_signature ?? entry.signature ?? ''}`, dotted));
  if (entry.returns) out.push(`Returns: ${typeMarkdown(entry.returns_parts, entry.returns)}`);
  out.push(...contracts(entry.name, entry.overload_contracts));
  out.push(...sectionText(entry.parsed, entry.doc, anchored, true));
  for (const member of entry.members ?? []) {
    if (shared.has(member.name)) continue;
    const id = `${dotted}.${member.name}`;
    if (!anchored) out.push(`<a id="${id}"></a>`);
    out.push(heading(anchored, depth + 1, `${id}${member.signature ?? ''}`, id));
    if (member.returns) out.push(`Returns: ${typeMarkdown(member.returns_parts, member.returns)}`);
    const value = pyMemberValue(member);
    if (member.annotation || value) out.push(`${member.annotation ? `Type: ${typeMarkdown(member.annotation_parts, member.annotation)}` : 'Value:'}${value ? `${member.annotation ? ' =' : ''} ${codeSpan(value)}` : ''}`);
    out.push(...contracts(member.name, member.overload_contracts));
    out.push(...sectionText(member.parsed, member.doc, anchored));
  }
  if (shared.size) {
    const links = [...shared].map(([name, target]) =>
      `<a id="${dotted}.${name}"></a>[${codeSpan(name)}](#${target})`,
    );
    out.push(`**Shared Future members:** ${links.join(' · ')}`);
  }
  return out.join('\n\n');
}

async function pythonText(pagePath: string, anchored: boolean, includeSummaries = true): Promise<string> {
  let raw: string;
  try {
    raw = await readFile(path.join(CONTENT_DIR, pagePath), 'utf8');
  } catch {
    return '';
  }
  const out: string[] = [];
  for (const item of directives(raw)) {
    if (item.kind !== 'PyClass' && item.kind !== 'PyFunction') continue;
    const dotted = item.source.match(/\bpath=["']([^"']+)["']/)?.[1];
    if (dotted) {
      if (anchored) {
        try { out.push(await entryText(dotted, anchored, 2)); } catch { /* Search remains best-effort. */ }
      } else out.push(await entryText(dotted, anchored, 2));
    }
  }
  if (includeSummaries) for (const item of directives(raw)) {
    if (item.kind !== 'PySummary') continue;
    const summary = item.source.match(PY_SUMMARY);
    if (!summary) continue;
    const paths = Array.from(summary[0].matchAll(/["']([^"']+)["']/g), (match) => match[1]);
    out.push(await summaryText(paths));
  }
  return out.join('\n\n');
}

async function restText(url: string, anchored: boolean): Promise<string> {
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
        heading(anchored, 2, `${method.toUpperCase()} ${route}`, endpointOperation(document, route, method).anchor),
        operation?.summary,
        operation?.description && unhead(anchored, operation.description),
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
