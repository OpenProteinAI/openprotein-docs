import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { createOpenAPI, type OpenAPIPageProps_Spec } from 'fumadocs-openapi/server';
import { listOperations, type SpecDocument } from './openapi-endpoints';

const SPEC_DIR = path.join(process.cwd(), 'specs');

/** Keep in sync with components/api-page.tsx. */
const PROXY_URL = '/api/playground-proxy';

/** The old site's toctree order; slugs stay as they were so REST API URLs still resolve. */
export const REST_API_PAGES = [
  { slug: 'authentication-and-jobs', id: 'auth', title: 'Authentication And Jobs' },
  { slug: 'assay-datasets', id: 'assaydata', title: 'Assay Datasets' },
  { slug: 'models', id: 'models', title: 'Models' },
  { slug: 'align', id: 'align', title: 'Align' },
  { slug: 'prompt', id: 'prompt', title: 'Prompt' },
  { slug: 'embeddings', id: 'embeddings', title: 'Foundation Models' },
  { slug: 'fold', id: 'fold', title: 'Structure Prediction' },
  { slug: 'predictor', id: 'predictor', title: 'Predictor' },
  { slug: 'design', id: 'design', title: 'Design' },
] as const;

export type SpecId = (typeof REST_API_PAGES)[number]['id'];
export type RestApiSlug = (typeof REST_API_PAGES)[number]['slug'];

export const SPEC_IDS: readonly SpecId[] = REST_API_PAGES.map((page) => page.id);

async function readSpec(id: SpecId): Promise<SpecDocument> {
  const file = path.join(SPEC_DIR, `${id}.openapi.json`);
  return JSON.parse(await readFile(file, 'utf8')) as SpecDocument;
}

export const openapi = createOpenAPI({
  input: Object.fromEntries(REST_API_PAGES.map((page) => [page.id, () => readSpec(page.id)])),
  proxyUrl: PROXY_URL,
});

export const getSpecDocument = cache(
  async (id: SpecId): Promise<SpecDocument> => (await openapi.getSchema(id)).bundled,
);

export function specIdForSlug(slug: string): SpecId | undefined {
  return REST_API_PAGES.find((page) => page.slug === slug)?.id;
}

/**
 * showTitle is not what anchors point at - renderOperationLayout drops the heading it builds,
 * and TOC anchors come from our own rows. It bumps fumadocs' headingLevel 2 -> 3 for the inner
 * Request/Response headings, and suppresses its duplicate Deprecated callout.
 */
export async function getApiPageProps(id: SpecId): Promise<OpenAPIPageProps_Spec> {
  const bundled = await getSpecDocument(id);
  return {
    payload: { bundled, proxyUrl: PROXY_URL },
    showTitle: true,
    showDescription: true,
    operations: listOperations(bundled),
  };
}
