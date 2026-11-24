import { parse as parseYaml } from 'yaml';

const FRONTMATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export interface SplitDoc {
  /** Frontmatter YAML, null when the file has none. */
  yaml: string | null;
  body: string;
  /** Source line the body starts on, 1-based. */
  bodyLine: number;
}

export function splitDoc(source: string): SplitDoc {
  const match = FRONTMATTER.exec(source);
  if (!match) return { yaml: null, body: source, bodyLine: 1 };
  return {
    yaml: match[1] ?? '',
    body: source.slice(match[0].length),
    bodyLine: match[0].split('\n').length - (match[0].endsWith('\n') ? 0 : 1),
  };
}

export function readFrontmatter(yaml: string | null): { data: Record<string, unknown>; error?: string } {
  if (!yaml?.trim()) return { data: {} };
  try {
    const value: unknown = parseYaml(yaml);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { data: value as Record<string, unknown> }
      : { data: {}, error: 'Frontmatter must be key: value pairs.' };
  } catch (error) {
    return { data: {}, error: error instanceof Error ? error.message : String(error) };
  }
}
