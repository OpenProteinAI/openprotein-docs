import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

const BIB_DIR = path.join(process.cwd(), 'content', 'bib');

export type BibAuthor = { family: string; given: string };

export type BibEntry = {
  key: string;
  type: string;
  file: string;
  authors: BibAuthor[];
  etAl: boolean;
  title: string;
  container?: string;
  year: string;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  url?: string;
  eprint?: string;
  archivePrefix?: string;
};

/** Only the escapes that occur in content/bib/*.bib. */
const ESCAPES = /\\([%#&_$])/g;

const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;

function skipWs(src: string, i: number): number {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function readValue(src: string, start: number): [string, number] {
  const i = skipWs(src, start);
  if (src[i] === '{') {
    let depth = 0;
    let j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    return [src.slice(i + 1, j), j + 1];
  }
  if (src[i] === '"') {
    let depth = 0;
    let j = i + 1;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '\\') j++;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '"' && depth === 0) break;
    }
    return [src.slice(i + 1, j), j + 1];
  }
  let j = i;
  while (j < src.length && src[j] !== ',' && src[j] !== '}') j++;
  return [src.slice(i, j), j];
}

function clean(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(ESCAPES, '$1').replace(/[{}]/g, '').trim();
}

function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (SUFFIX.test(w) ? w : `${w[0].toUpperCase()}.`))
    .join(' ');
}

/** These files write authors loosely: "Russ et al.", "Lin Li et al", "Lin, Z. et al,". */
function parseAuthors(raw: string): { authors: BibAuthor[]; etAl: boolean } {
  const authors: BibAuthor[] = [];
  let etAl = false;
  for (const part of raw.split(/\s+and\s+/i)) {
    const trimmed = part.trim().replace(/,$/, '');
    const truncated = trimmed.match(/^(.*?)[,\s]*\bet\s+al\.?$/i);
    const name = (truncated ? truncated[1] : trimmed).trim().replace(/,$/, '');
    if (truncated) etAl = true;
    if (!name) continue;
    const comma = name.indexOf(',');
    if (comma >= 0) {
      authors.push({ family: name.slice(0, comma).trim(), given: name.slice(comma + 1).trim() });
    } else {
      const words = name.split(/\s+/);
      authors.push({ family: words.pop() ?? name, given: words.join(' ') });
    }
  }
  return { authors, etAl };
}

function parseEntries(src: string, file: string): BibEntry[] {
  const entries: BibEntry[] = [];
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf('@', i);
    if (at < 0) break;
    const open = src.indexOf('{', at);
    if (open < 0) break;
    const type = src.slice(at + 1, open).trim().toLowerCase();
    i = open + 1;
    if (type === 'comment' || type === 'preamble' || type === 'string') {
      i = readValue(src, open)[1];
      continue;
    }
    let j = i;
    while (j < src.length && src[j] !== ',' && src[j] !== '}') j++;
    const key = src.slice(i, j).trim();
    const empty = src[j] === '}';
    i = j + 1;

    const fields = new Map<string, string>();
    while (!empty && i < src.length) {
      i = skipWs(src, i);
      if (src[i] === ',') {
        i++;
        continue;
      }
      if (src[i] === '}' || i >= src.length) {
        i++;
        break;
      }
      const eq = src.indexOf('=', i);
      if (eq < 0) {
        i = src.length;
        break;
      }
      const name = src.slice(i, eq).trim().toLowerCase();
      const [raw, next] = readValue(src, eq + 1);
      fields.set(name, clean(raw));
      i = next;
    }

    const title = fields.get('title');
    const year = fields.get('year');
    if (!key) throw new Error(`bib: entry in ${file} has no citation key`);
    if (!title) throw new Error(`bib: entry "${key}" in ${file} has no title`);
    if (!year) throw new Error(`bib: entry "${key}" in ${file} has no year`);

    const { authors, etAl } = parseAuthors(fields.get('author') ?? '');
    entries.push({
      key,
      type,
      file,
      authors,
      etAl,
      title,
      container: fields.get('journal') ?? fields.get('booktitle'),
      year,
      volume: fields.get('volume'),
      number: fields.get('number'),
      pages: fields.get('pages'),
      doi: fields.get('doi'),
      url: fields.get('url'),
      eprint: fields.get('eprint'),
      archivePrefix: fields.get('archiveprefix'),
    });
  }
  return entries;
}

function resolveBib(file: string): string {
  const rel = file.replace(/^\.?\/?content\/bib\//, '');
  const full = path.join(BIB_DIR, rel);
  if (!full.startsWith(`${BIB_DIR}${path.sep}`)) {
    throw new Error(`bib: "${file}" resolves outside content/bib/`);
  }
  return full;
}

const readBibFile = cache(async (file: string): Promise<BibEntry[]> => {
  const full = resolveBib(file);
  let src: string;
  try {
    src = await readFile(full, 'utf8');
  } catch {
    throw new Error(`bib: cannot read "${file}" (looked in ${full})`);
  }
  const entries = parseEntries(src, file);
  if (entries.length === 0) throw new Error(`bib: no entries parsed from "${file}"`);
  return entries;
});

export async function readBib(files: string[]): Promise<Map<string, BibEntry>> {
  const lists = await Promise.all([...new Set(files)].map((file) => readBibFile(file)));
  const map = new Map<string, BibEntry>();
  for (const entry of lists.flat()) {
    const seen = map.get(entry.key);
    if (seen) throw new Error(`bib: duplicate key "${entry.key}" in ${seen.file} and ${entry.file}`);
    map.set(entry.key, entry);
  }
  return map;
}

/** Every .bib file, so <Cite> resolves a key without naming its file. */
export const readAllBib = cache(async (): Promise<Map<string, BibEntry>> => {
  const files = (await readdir(BIB_DIR)).filter((f) => f.endsWith('.bib')).sort();
  return readBib(files);
});

export function getEntry(entries: Map<string, BibEntry>, key: string): BibEntry {
  const entry = entries.get(key);
  if (!entry) {
    throw new Error(
      `bib: unknown citation key "${key}". Known keys: ${[...entries.keys()].join(', ')}`,
    );
  }
  return entry;
}

export function formatAuthors(entry: BibEntry): string {
  const families = entry.authors.map((a) => a.family);
  if (families.length === 0) return '';
  if (entry.etAl || families.length > 2) return `${families[0]} et al.`;
  if (families.length === 2) return `${families[0]} and ${families[1]}`;
  return families[0];
}

export function formatAuthorList(entry: BibEntry): string {
  const names = entry.authors.map((a) => (a.given ? `${a.family}, ${initials(a.given)}` : a.family));
  const joined =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');
  return entry.etAl ? `${joined} et al.`.trim() : joined;
}

function sentence(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

export function formatCitation(entry: BibEntry): string {
  const parts: string[] = [];
  const authors = formatAuthorList(entry);
  parts.push(authors ? `${authors} (${entry.year}).` : `(${entry.year}).`);
  parts.push(sentence(entry.title));
  const where: string[] = [];
  if (entry.container) where.push(entry.container);
  if (entry.volume) where.push(entry.number ? `${entry.volume}(${entry.number})` : entry.volume);
  if (entry.pages) where.push(entry.pages.replace(/--/g, '–'));
  if (where.length > 0) parts.push(sentence(where.join(', ')));
  if (entry.eprint) parts.push(`${entry.archivePrefix ?? 'arXiv'}:${entry.eprint}.`);
  return parts.join(' ');
}

export function citationLink(entry: BibEntry): { href: string; label: string } | null {
  if (entry.doi) return { href: `https://doi.org/${entry.doi}`, label: `doi:${entry.doi}` };
  if (entry.url) return { href: entry.url, label: entry.url.replace(/^https?:\/\//, '') };
  return null;
}

/** Reference lists read alphabetically, as sphinxcontrib-bibtex rendered them. */
export function sortEntries(entries: Iterable<BibEntry>): BibEntry[] {
  return [...entries].sort((a, b) => {
    const byName = (a.authors[0]?.family ?? '').localeCompare(b.authors[0]?.family ?? '');
    return byName !== 0 ? byName : a.year.localeCompare(b.year);
  });
}
