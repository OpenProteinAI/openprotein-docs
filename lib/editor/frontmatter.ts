import { isScalar, parseDocument } from 'yaml';
import { splitDoc } from './doc';

export const EMPTY_DOC = '---\ntitle: ""\ndescription: ""\n---\n\n';

// Double quotes where quoting is needed, as the docs' frontmatter does.
const YAML_OUT = { lineWidth: 0, singleQuote: false } as const;

/** Keys the settings panel edits by name; any other key is a custom attribute. */
export const KNOWN_KEYS = ['title', 'sidebarTitle', 'description', 'notebook', 'duoContent'] as const;

export interface Attribute {
  key: string;
  value: string;
  /** Lists and maps: shown, edited in the source only. */
  readOnly: boolean;
}

export interface Settings {
  title: string;
  sidebarTitle: string;
  description: string;
  notebook: string;
  duoContent: boolean;
  attributes: Attribute[];
  error?: string;
}

export function readSettings(source: string): Settings {
  const { yaml } = splitDoc(source);
  const doc = parseDocument(yaml ?? '');
  const data = (doc.errors.length ? {} : (doc.toJS() ?? {})) as Record<string, unknown>;
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : data[key] == null ? '' : String(data[key]));
  const attributes: Attribute[] = [];
  for (const [key, value] of Object.entries(data)) {
    if ((KNOWN_KEYS as readonly string[]).includes(key)) continue;
    const node = doc.get(key, true);
    const scalar = node === undefined || isScalar(node);
    attributes.push({ key, value: scalar ? String(value ?? '') : JSON.stringify(value), readOnly: !scalar });
  }
  return {
    title: text('title'),
    sidebarTitle: text('sidebarTitle'),
    description: text('description'),
    notebook: text('notebook'),
    duoContent: data.duoContent === true,
    attributes,
    error: doc.errors[0]?.message,
  };
}

/** Rewrites the frontmatter block, keeping key order and quoting where it can. */
/** null or false deletes a key. */
export function writeSettings(source: string, changes: Record<string, string | boolean | null>): string {
  const { yaml, body } = splitDoc(source);
  const doc = parseDocument(yaml ?? '');
  if (doc.errors.length) return source;
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === false || value === undefined) doc.delete(key);
    else doc.set(key, value);
  }
  const text = doc.toString(YAML_OUT).replace(/\n$/, '');
  return `---\n${text === '{}' ? '' : text}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`;
}

/** Renames a custom key in place; false when the new key is taken. */
export function renameKey(source: string, from: string, to: string): string | null {
  const { yaml, body } = splitDoc(source);
  const doc = parseDocument(yaml ?? '');
  if (doc.errors.length || !to || doc.has(to)) return null;
  const pair = doc.contents && 'items' in doc.contents ? doc.contents.items.find((item) => String((item as { key: unknown }).key) === from) : null;
  if (!pair) return null;
  (pair as { key: unknown }).key = doc.createNode(to);
  const text = doc.toString(YAML_OUT).replace(/\n$/, '');
  return `---\n${text}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`;
}
