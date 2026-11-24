import 'server-only';
import type { OpenAPIPageProps_Spec } from 'fumadocs-openapi/server';
import { getSpecDocument, withAuthServer, type SpecId } from '@/lib/openapi';
import { operationKey, type EndpointMethod, type SpecDocument } from '@/lib/openapi-endpoints';
import { endpointLabel, JOB_STATUS_PATH, modelMethod, RESULT_PATHS, runOrder } from '@/lib/model-endpoints';
import type { ModelCard } from '@/lib/model-cards';

/** One POST per model method. */
const RUN_SPEC: SpecId = 'models';
/** Where the methods' jobs are read back. */
const RESULT_SPECS: SpecId[] = ['embeddings', 'fold', 'design'];
const JOB_SPEC: SpecId = 'auth';
const METHODS: EndpointMethod[] = ['get', 'post', 'patch', 'delete', 'head', 'put'];

interface Operation {
  path: string;
  method: EndpointMethod;
}

/** One spec's share of a base model's endpoints, each rendered once. */
export interface SpecOperations {
  specId: SpecId;
  operations: Operation[];
}

export interface ModelEndpoints {
  /** Every version's run operations, by spec. */
  run: SpecOperations[];
  /** Job status, then each spec's result reads. */
  results: SpecOperations[];
  /** Per version, the `operationKey`s it shows: its runs, the job status and its results. */
  visible: Record<string, string[]>;
}

/**
 * A base model's REST operations, read from the committed specs: a version's runs are the models
 * spec's `/api/v1/models/<model id>/<method>`. `pnpm update:restapi` brings new models in.
 */
export async function getModelEndpoints(versionIds: string[]): Promise<ModelEndpoints> {
  const docs = new Map<SpecId, SpecDocument>(
    await Promise.all(
      [RUN_SPEC, ...RESULT_SPECS, JOB_SPEC].map(async (id) => [id, await getSpecDocument(id)] as const),
    ),
  );
  const has = (specId: SpecId, path: string) => !!docs.get(specId)?.paths?.[path]?.get;

  const run: (Operation & { order: number })[] = [];
  // Each result read is listed where the first method that needs it is.
  const results = new Map<SpecId, (Operation & { order: number })[]>();
  const visible: Record<string, string[]> = {};

  for (const modelId of versionIds) {
    const keys: string[] = [];

    for (const [path, pathItem] of Object.entries(docs.get(RUN_SPEC)?.paths ?? {})) {
      const method = modelMethod(path, modelId);
      if (!method || !pathItem) continue;
      const order = runOrder(method);

      for (const verb of METHODS) {
        if (!pathItem[verb]) continue;
        run.push({ path, method: verb, order });
        keys.push(operationKey(path, verb));
      }

      for (const result of RESULT_PATHS[method] ?? []) {
        const specId = RESULT_SPECS.find((id) => has(id, result));
        if (!specId) continue;
        const listed = results.get(specId) ?? [];
        const found = listed.find((op) => op.path === result);
        if (found) found.order = Math.min(found.order, order);
        else results.set(specId, [...listed, { path: result, method: 'get', order }]);
        keys.push(operationKey(result, 'get'));
      }
    }

    if (keys.length && has(JOB_SPEC, JOB_STATUS_PATH)) keys.push(operationKey(JOB_STATUS_PATH, 'get'));
    visible[modelId] = [...new Set(keys)];
  }

  const anyRuns = Object.values(visible).some((keys) => keys.length);
  return {
    run: run.length
      ? [
          {
            specId: RUN_SPEC,
            operations: run.sort((a, b) => a.order - b.order).map(({ path, method }) => ({ path, method })),
          },
        ]
      : [],
    results: [
      ...(anyRuns ? [{ specId: JOB_SPEC, operations: [{ path: JOB_STATUS_PATH, method: 'get' as const }] }] : []),
      ...[...results].map(([specId, operations]) => ({
        specId,
        operations: operations.sort((a, b) => a.order - b.order).map(({ path, method }) => ({ path, method })),
      })),
    ],
    visible,
  };
}

/**
 * `getApiPageProps` for a handful of operations: the spec cut down to their paths and the schemas
 * those reach, so the page ships kilobytes of it rather than all of it (models is ~350 KB).
 */
export async function getModelApiPageProps({ specId, operations }: SpecOperations): Promise<OpenAPIPageProps_Spec> {
  const bundled = await getSpecDocument(specId);
  const paths = Object.fromEntries(
    Object.entries(bundled.paths ?? {}).filter(([path]) => operations.some((op) => op.path === path)),
  );
  const components = bundled.components && {
    ...bundled.components,
    schemas: reachableSchemas(paths, bundled.components.schemas ?? {}),
  };

  return {
    payload: { bundled: withAuthServer({ ...bundled, paths, components }) },
    showTitle: true,
    showDescription: true,
    operations,
  };
}

const SCHEMA_REF = '#/components/schemas/';

/** The schemas `paths` reach through `$ref`, directly or through other schemas. */
function reachableSchemas<T>(paths: object, schemas: Record<string, T>): Record<string, T> {
  const reached = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key !== '$ref' || typeof value !== 'string') visit(value);
      else if (value.startsWith(SCHEMA_REF) && !reached.has(value.slice(SCHEMA_REF.length))) {
        reached.add(value.slice(SCHEMA_REF.length));
        visit(schemas[value.slice(SCHEMA_REF.length)]);
      }
    }
  };
  visit(paths);
  return Object.fromEntries(Object.entries(schemas).filter(([name]) => reached.has(name)));
}

/** The endpoints as markdown, for a model page's .md: each version's runs, then the result reads. */
export function endpointsMarkdown(versions: ModelCard[], endpoints: ModelEndpoints) {
  const line = ({ path, method }: Operation) =>
    `- ${endpointLabel(path) ?? path}: \`${method.toUpperCase()} ${path}\``;
  const runs = endpoints.run.flatMap((spec) => spec.operations);
  const sections = versions
    .map((card) => {
      const own = runs.filter((op) => endpoints.visible[card.id]?.includes(operationKey(op.path, op.method)));
      return own.length ? [`### ${card.name}`, own.map(line).join('\n')].join('\n\n') : null;
    })
    .filter(Boolean);
  if (!sections.length) return '';

  const results = endpoints.results.flatMap((spec) => spec.operations).map(line).join('\n');
  return ['## Endpoints', ...sections, '### Get results', results].join('\n\n');
}
