import type { SpecDocument } from './openapi-endpoints';

export const LIVE_SPEC_PATHS = {
  prompt: '/api/v1/prompt/openapi.json',
  models: '/openapi.json',
} as const;

export type LiveSpecId = keyof typeof LIVE_SPEC_PATHS;

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;
const MODELS_PREFIX = '/api/v1/models';

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// A 200 with a wrong-shaped body must keep the vendored fallback, not blank
// the page (or throw mid-render).
function isUsableSpec(doc: unknown): doc is SpecDocument {
  if (!isObject(doc)) return false;
  return typeof doc.openapi === 'string' && isObject(doc.paths) && Object.keys(doc.paths).length > 0;
}

export function prepareLiveSpec(
  id: LiveSpecId,
  document: unknown,
  servers: NonNullable<SpecDocument['servers']>,
): SpecDocument | null {
  if (!isUsableSpec(document)) return null;
  const paths: NonNullable<SpecDocument['paths']> = {};
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    if (id === 'models' && path !== MODELS_PREFIX && !path.startsWith(`${MODELS_PREFIX}/`)) continue;
    // Fumadocs resolves a `$ref` under its siblings, so a referenced path item or
    // operation could bring back the `servers` stripped here.
    if (!isObject(item) || '$ref' in item) return null;
    const selected: Record<string, unknown> = { ...item };
    // Nested server overrides must not bypass the playground's pinned origin.
    delete selected.servers;
    for (const method of METHODS) {
      if (!(method in selected)) continue;
      const operation = selected[method];
      if (!isObject(operation) || '$ref' in operation) return null;
      const { servers: _, ...rest } = operation;
      selected[method] = rest;
    }
    paths[path] = selected;
  }
  if (!Object.keys(paths).length) return null;
  return { ...document, paths, servers };
}
