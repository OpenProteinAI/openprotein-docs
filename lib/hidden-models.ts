import type { SpecDocument } from './openapi-endpoints';

// Models these docs leave out, though the API lists them.
const HIDDEN = /^(?:gibbs|alphaflow|esmflow|bioemu)/i;
const HIDDEN_TAG = 'ensemble';
const MODELS_PREFIX = '/api/v1/models/';
const SCHEMA_REF = '#/components/schemas/';

export function isHiddenModelId(id: string): boolean {
  return HIDDEN.test(id);
}

export function isHiddenModel(model: { model_id: string; tags?: string[] | null }): boolean {
  return isHiddenModelId(model.model_id) || !!model.tags?.includes(HIDDEN_TAG);
}

/** `/api/v1/models/<model id>/…` */
function isHiddenModelPath(path: string): boolean {
  return path.startsWith(MODELS_PREFIX) && isHiddenModelId(path.slice(MODELS_PREFIX.length).split('/')[0]);
}

/** Schemas the paths reach, through their refs. */
function reachableSchemas(spec: SpecDocument, paths: object): Set<string> {
  const schemas = (spec.components?.schemas ?? {}) as Record<string, unknown>;
  const found = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key === '$ref' && typeof child === 'string' && child.startsWith(SCHEMA_REF)) {
          const name = child.slice(SCHEMA_REF.length);
          if (!found.has(name)) {
            found.add(name);
            walk(schemas[name]);
          }
        } else walk(child);
      }
    }
  };
  walk(paths);
  return found;
}

function operationTags(paths: object): Set<string> {
  return new Set(
    Object.values(paths).flatMap((item: Record<string, { tags?: string[] }>) =>
      Object.values(item ?? {}).flatMap((operation) => operation?.tags ?? []),
    ),
  );
}

/** Model id enums, such as `{model_id}`'s, without the hidden ids. */
function withoutHiddenIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutHiddenIds) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'enum' && Array.isArray(child)
        ? child.filter((item) => typeof item !== 'string' || !isHiddenModelId(item))
        : withoutHiddenIds(child),
    ]),
  ) as T;
}

/** The models spec without the hidden models' paths, ids, or the tags and schemas only they used. */
export function withoutHiddenModels(spec: SpecDocument): SpecDocument {
  const all = spec.paths ?? {};
  const paths = Object.fromEntries(Object.entries(all).filter(([route]) => !isHiddenModelPath(route)));
  const keptSchemas = reachableSchemas(spec, paths);
  const keptTags = operationTags(paths);
  const droppedTags = new Set([...operationTags(all)].filter((tag) => !keptTags.has(tag)));
  const schemas = { ...spec.components?.schemas };
  for (const name of reachableSchemas(spec, all)) if (!keptSchemas.has(name)) delete schemas[name];
  return withoutHiddenIds({
    ...spec,
    paths,
    tags: spec.tags?.filter((tag) => !droppedTags.has(tag.name ?? '')),
    components: { ...spec.components, schemas },
  });
}
