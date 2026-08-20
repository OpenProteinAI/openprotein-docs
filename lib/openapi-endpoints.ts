import type { OpenAPIV3_2 } from 'fumadocs-openapi';
import { slug } from 'github-slugger';

export type SpecDocument = OpenAPIV3_2.Document;
export type EndpointMethod = 'get' | 'post' | 'patch' | 'delete' | 'head' | 'put';

/** fumadocs-openapi's own key order, so our operation list matches the order it renders. */
const METHODS: readonly EndpointMethod[] = ['get', 'post', 'patch', 'delete', 'head', 'put'];

/** Ported from __old/source/_static/js/swaggerEmbeddings.js. */
const GROUP_TITLES: Record<string, string> = {
  openprotein: 'OpenProtein',
  esm1: 'ESM1',
  esm2: 'ESM2',
  community: 'Community-based',
  antibody: 'Antibody',
};

/** Unknown group keys were capitalised by the old site; without this esmc renders lowercase. */
function titleCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** The synthetic parent for single-tag operations of a hierarchical spec. */
const OVERVIEW = 'overview';
const OVERVIEW_TITLE = 'Overview';

/** Undeclared tags sort after every declared one, in first-appearance order. */
const UNDECLARED = 1e6;

export interface EndpointOperation {
  path: string;
  method: EndpointMethod;
  /** The heading text fumadocs-openapi renders, which its anchor is derived from. */
  title: string;
  /** Shorter TOC label: the computation type on hierarchical specs, else the title. */
  label: string;
  anchor: string;
  deprecated: boolean;
}

export interface EndpointSection {
  key: string;
  title: string;
  anchor: string;
  description?: string;
  /** Declared tag index; orders siblings the way the spec declares its tags. */
  order: number;
  operations: EndpointOperation[];
  sections: EndpointSection[];
}

export interface EndpointTree {
  /** Untagged operations, rendered before any section. */
  operations: EndpointOperation[];
  sections: EndpointSection[];
}

/** Copied from @fumadocs/api-docs (not exported); operation anchors must match it. */
function idToTitle(id: string): string {
  let result: string[] = [];
  for (const c of id)
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    else if (c === '.') result = [];
    else if (/^[A-Z]$/.test(c) && result.at(-1) !== ' ') result.push(' ', c);
    else if (c === '-') result.push(' ');
    else result.push(c);
  return result.join('');
}

function eachOperation(
  document: SpecDocument,
  visit: (
    path: string,
    method: EndpointMethod,
    operation: OpenAPIV3_2.OperationObject,
    pathItem: OpenAPIV3_2.PathItemObject,
  ) => void,
): void {
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (operation) visit(path, method, operation, pathItem);
    }
  }
}

/** Mirrors fumadocs-openapi's own fallback chain, '||' included. */
function operationTitle(
  operation: OpenAPIV3_2.OperationObject,
  pathItem: OpenAPIV3_2.PathItemObject,
  path: string,
): string {
  return (
    operation.summary ||
    pathItem.summary ||
    (operation.operationId ? idToTitle(operation.operationId) : path)
  );
}

/** fumadocs-openapi slugs the heading text with a stateless slugger, so no dedup suffix. */
export function operationAnchor(title: string): string {
  return slug(title);
}

/** The old Sphinx site anchored tag sections as '<tag>-endpoint'; deep links keep working. */
export function sectionAnchor(key: string): string {
  return `${slug(key)}-endpoint`;
}

export function listOperations(document: SpecDocument): {
  path: string;
  method: EndpointMethod;
}[] {
  const items: { path: string; method: EndpointMethod }[] = [];
  eachOperation(document, (path, method) => items.push({ path, method }));
  return items;
}

export function operationKey(path: string, method: string): string {
  return `${method.toLowerCase()} ${path}`;
}

/**
 * Embeddings tags a model operation [group, ...models, computationType]; every other spec
 * tags an operation with the section it belongs to.
 */
function chainOf(tags: string[], hierarchical: boolean): string[] {
  if (!hierarchical || tags.length < 2) {
    return hierarchical && tags.length === 1 ? [OVERVIEW, tags[0]] : tags;
  }
  return tags.length >= 3 ? tags.slice(0, -1) : tags;
}

export function buildEndpointTree(document: SpecDocument): EndpointTree {
  const order = new Map<string, number>();
  const descriptions = new Map<string, string>();
  (document.tags ?? []).forEach((tag, index) => {
    if (!tag.name) return;
    order.set(tag.name, index);
    if (tag.description) descriptions.set(tag.name, tag.description);
  });

  let undeclared = 0;
  const orderOf = (key: string): number => {
    let value = order.get(key);
    if (value === undefined) {
      value = UNDECLARED + undeclared++;
      order.set(key, value);
    }
    return value;
  };

  let hierarchical = false;
  eachOperation(document, (_path, _method, operation) => {
    if ((operation.tags?.length ?? 0) >= 3) hierarchical = true;
  });

  const tree: EndpointTree = { operations: [], sections: [] };

  const child = (parent: EndpointTree, key: string): EndpointSection => {
    const found = parent.sections.find((section) => section.key === key);
    if (found) return found;
    const created: EndpointSection = {
      key,
      title: key === OVERVIEW ? OVERVIEW_TITLE : (GROUP_TITLES[key] ?? titleCase(key)),
      anchor: sectionAnchor(key),
      description: descriptions.get(key),
      order: key === OVERVIEW ? -1 : orderOf(key),
      operations: [],
      sections: [],
    };
    parent.sections.push(created);
    return created;
  };

  eachOperation(document, (path, method, operation, pathItem) => {
    const tags = operation.tags ?? [];
    const title = operationTitle(operation, pathItem, path);
    const label = hierarchical && tags.length >= 3 ? tags[tags.length - 1] : title;
    const entry: EndpointOperation = {
      path,
      method,
      title,
      label,
      anchor: operationAnchor(title),
      deprecated: operation.deprecated ?? false,
    };

    let level: EndpointTree = tree;
    for (const key of chainOf(tags, hierarchical)) level = child(level, key);
    level.operations.push(entry);
  });

  const sort = (sections: EndpointSection[]): void => {
    sections.sort((a, b) => a.order - b.order);
    for (const section of sections) sort(section.sections);
  };
  sort(tree.sections);

  return tree;
}
