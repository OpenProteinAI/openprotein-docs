import 'server-only';
import type { AdvancedIndex } from 'fumadocs-core/search/server';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {
  buildModelCards,
  inputTypeLabel,
  methodOutputLabel,
  type ModelCard,
  type ModelMetadata,
} from '@/lib/model-cards';
import { baseModelViews, versionDescription, type BaseModelView } from '@/lib/base-models';
import { MODELS_API_URL, type ModelFamilyDoc } from '@/lib/model-families';
import { MODELS_DESCRIPTION, MODELS_TITLE, MODELS_URL, versionPageUrl } from '@/lib/models-tree';
import { isHiddenModel } from '@/lib/hidden-models';

/** How often the server build refetches the catalogue; the static export keeps its build-time copy. */
const REVALIDATE_SECONDS = 3600;

const CATALOGUE_URL = `${MODELS_API_URL}?scope=system&verbose=true&sort_by=relevance`;
const FAMILIES_URL = `${MODELS_API_URL}/families`;

// Raw HTML dropped, the rest sanitised.
const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze();

/** Models share most method descriptions. */
const methodHtml = new Map<string, string>();

function withMethodHtml(model: ModelMetadata): ModelMetadata {
  const methods = model.methods.map((method) => {
    const description = method.description?.trim();
    if (!description) return method;
    if (!methodHtml.has(description)) methodHtml.set(description, String(markdown.processSync(description)));
    return { ...method, descriptionHtml: methodHtml.get(description) };
  });
  return { ...model, methods };
}

/**
 * The platform's system models, as `/models` serves them. Null when the API can't be reached, so
 * the page says so instead of failing the build.
 */
export async function getSystemModels(): Promise<ModelMetadata[] | null> {
  if (!MODELS_API_URL) return null;
  try {
    const response = await fetch(CATALOGUE_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;

    const models = (await response.json()) as ModelMetadata[];
    return Array.isArray(models)
      ? models.filter((model) => model.is_system && !isHiddenModel(model)).map(withMethodHtml)
      : null;
  } catch {
    return null;
  }
}

/** The families, as `/models/families` lists them. Empty when the API can't be reached. */
export async function getModelFamilyDocs(): Promise<ModelFamilyDoc[]> {
  if (!MODELS_API_URL) return [];
  try {
    const response = await fetch(FAMILIES_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return [];

    const docs = (await response.json()) as ModelFamilyDoc[];
    return Array.isArray(docs) ? docs : [];
  } catch {
    return [];
  }
}

/** Every base model's page, in the sidebar's order. */
export async function getBaseModels(): Promise<BaseModelView[]> {
  const [models, docs] = await Promise.all([getSystemModels(), getModelFamilyDocs()]);
  return baseModelViews(models ?? [], docs);
}

export async function getBaseModel(id: string): Promise<BaseModelView | undefined> {
  return (await getBaseModels()).find((view) => view.id === id);
}

/** The catalogue as markdown, for /models.md: one section per model, in the page's own order. */
export function modelsMarkdown(models: ModelMetadata[], families: ModelFamilyDoc[] = []) {
  return cardsMarkdown(buildModelCards(models, families));
}

/** The catalogue, then every base model's page and every other version's, for the search box. */
export async function modelSearchIndexes(): Promise<AdvancedIndex[]> {
  const [models, docs] = await Promise.all([getSystemModels(), getModelFamilyDocs()]);
  const catalogue: AdvancedIndex = {
    id: MODELS_URL,
    url: MODELS_URL,
    title: MODELS_TITLE,
    description: MODELS_DESCRIPTION,
    structuredData: { headings: [], contents: [] },
  };

  const versions = baseModelViews(models ?? [], docs).flatMap((view) =>
    view.versions.map((card): AdvancedIndex => {
      const url = versionPageUrl(view, card.id);
      const isBase = card.id === view.defaultVersion;
      const lines = [
        isBase ? card.name : '',
        versionDescription(card),
        cardRows(card).join(' · ').replaceAll('`', ''),
      ];
      return {
        // Lines get `<id>-N`: `/models/poet-2` would clash.
        id: `${url}#`,
        url,
        title: isBase ? view.name : card.name,
        description: isBase ? view.summary : card.description.replaceAll('\n\n', ' '),
        breadcrumbs: isBase ? [MODELS_TITLE] : [MODELS_TITLE, view.name],
        structuredData: {
          headings: [],
          contents: lines.filter(Boolean).map((content) => ({ heading: undefined, content })),
        },
      };
    }),
  );

  return models ? [catalogue, ...versions] : [catalogue];
}

/** One version's page as markdown, for /models/<model>/<version>.md. */
export function versionMarkdown(card: ModelCard, endpoints = '') {
  return [cardRows(card).map((row) => `- ${row}`).join('\n'), endpoints || null].filter(Boolean).join('\n\n');
}

/** A base model's page as markdown, for /models/<model>.md; `endpoints` goes where the page has it. */
export function baseModelMarkdown(view: BaseModelView, endpoints = '') {
  return ['## Model versions', cardsMarkdown(view.versions, '###'), endpoints || null].filter(Boolean).join('\n\n');
}

function cardsMarkdown(cards: ModelCard[], heading = '##') {
  return cards
    .map((card) =>
      [`${heading} ${card.name}`, card.description || null, cardRows(card).map((row) => `- ${row}`).join('\n')]
        .filter(Boolean)
        .join('\n\n'),
    )
    .join('\n\n');
}

/** A version's facts, one per line. */
function cardRows(card: ModelCard) {
  return [
    `ID: \`${card.id}\``,
    `Family: ${card.familyName}`,
    `Inputs: ${card.inputTypes.map(inputTypeLabel).join(', ')}`,
    `Outputs: ${card.methodChips
      .map((chip) => `${methodOutputLabel(chip.output)} (${chip.methods.map((m) => `\`${m.path}\``).join(', ')})`)
      .join(', ')}`,
    ...card.info.filter((row) => row.label !== 'Family').map((row) => `${row.label}: ${row.value}`),
    card.tools.length ? `Tools: ${card.tools.map((tool) => tool.text).join(', ')}` : null,
    card.citation ? `Citation: ${card.citation}` : null,
    card.doiUrl ? `Paper: ${card.doiUrl}` : null,
    card.githubUrl ? `Code: ${card.githubUrl}` : null,
  ].filter((row) => row !== null);
}
