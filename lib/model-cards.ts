import type { ModelFamilyDoc } from '@/lib/model-families';
import { SITE } from '@/lib/site';

// A port of the web app's model cards (ui: src/composables/useModelCards.ts), narrowed to the
// system models: no user-model specs, evaluations or trained properties.

export interface ModelMethod {
  /** `batch/embeddings`, or an action: `crossvalidate`. */
  path: string;
  /** Split from `path`; empty for an action. */
  input: string;
  output: string;
  /** The default first. */
  outputs: string[];
  default_output?: string | null;
  /** Markdown. */
  description?: string | null;
  /** `description` rendered, on the server. */
  descriptionHtml?: string;
  name?: string | null;
}

/** `path`, or the older `input` and `output`. */
type CatalogueMethod = Omit<ModelMethod, 'input' | 'output'> | Omit<ModelMethod, 'path'>;

/** One chip per output, its methods in one tooltip. */
export interface ModelMethodChip {
  output: string;
  methods: ModelMethod[];
}

/** A label on a model card; `new` marks a model added to the platform in the last 60 days. */
export type ModelBadge = 'recommended' | 'highlight' | 'popular' | 'new';

/** A model as `/models?verbose=true` lists it. */
export interface ModelMetadata {
  model_id: string;
  /** The model's family, by `ModelFamilyDoc.id`. */
  family_id?: string | null;
  /** Base model, e.g. `ESM2`. */
  model?: string | null;
  /** Full display name, e.g. `ESM2 (650M)`. */
  name?: string | null;
  is_system: boolean;
  /** Its base model's default version. */
  base?: boolean;
  /** Its label among its base model's versions, e.g. `650M`. */
  variant?: string | null;
  badges?: ModelBadge[];
  tags?: string[] | null;
  input_types?: string[] | null;
  description: {
    summary: string;
    citation_title?: string | null;
    doi?: string | null;
    github?: string | null;
  };
  /** `-1` when the model has no embedding dimension. */
  dimension: number;
  query?: 'sequence' | 'structure' | 'both' | null;
  multichain?: boolean | null;
  methods: CatalogueMethod[];
  max_sequence_length: number;
}

export type ModelToolKey =
  | 'de_novo_design'
  | 'train'
  | 'score_sequences'
  | 'substitution_analysis'
  | 'indel_analysis'
  | 'structure_prediction'
  | 'cluster'
  | 'hit_selection';

/** A tool the model can run in, opened in the web app. */
export interface ModelToolLink {
  key: ModelToolKey;
  text: string;
  href: string;
}

export interface ModelInfoRow {
  label: string;
  value: string;
}

export interface ModelCard {
  id: string;
  name: string;
  /** Base model name. */
  baseName: string;
  isBase: boolean;
  /** Its label among its base model's versions, else its name. */
  version: string;
  recommended: boolean;
  popular: boolean;
  highlight: boolean;
  isNew: boolean;
  /** The family's id, which groups and links cards. */
  family: string;
  /** What the family is shown as: its doc's name, else its id. */
  familyName: string;
  inputTypes: string[];
  methods: ModelMethod[];
  methodChips: ModelMethodChip[];
  /** The `output` of each method, which the listing filters and searches on. */
  methodOutputs: string[];
  description: string;
  info: ModelInfoRow[];
  doiUrl: string;
  citation: string;
  githubUrl: string;
  tools: ModelToolLink[];
  /** Extra text the search box matches on top of the displayed fields. */
  keywords: string[];
}

export type ModelSortKey = 'relevant' | 'name' | 'family';
export type SortDirection = 'asc' | 'desc';

export interface ModelFilterSection {
  key: string;
  title: string;
  items: { value: string; text: string; disabled?: boolean }[];
}

/** Chip colour per method output, so the same output reads the same across cards. */
export const METHOD_OUTPUT_COLORS: Record<string, string> = {
  embeddings: 'is--blue',
  logits: 'is--teal',
  attn: 'is--purple',
  loglikelihood: 'is--green',
  sequences: 'is--cyan',
  structures: 'is--indigo',
  predictions: 'is--orange',
};

/** The bucket for a model the API reports no family for, so the Family filter can still offer it. */
export const MODEL_FAMILY_OTHER = 'other';
const MODEL_FAMILY_OTHER_NAME = 'Other';

/** Every field of a card the search box matches; `keywords` carries the rest of the metadata. */
export const MODEL_CARD_SEARCH_KEYS = [
  'name',
  'id',
  'family',
  'familyName',
  'inputTypes',
  'description',
  'keywords',
] as const satisfies readonly (keyof ModelCard)[];

export const MODEL_FILTER_FAMILY = 'family';
export const MODEL_FILTER_METHOD_OUTPUT = 'method_output';
export const MODEL_FILTER_INPUT_TYPE = 'input_type';

/** URL query key per filter section, as the app's Models page names them. */
export const MODEL_FILTER_QUERY_KEYS: Record<string, string> = {
  [MODEL_FILTER_FAMILY]: 'family',
  [MODEL_FILTER_METHOD_OUTPUT]: 'method',
  [MODEL_FILTER_INPUT_TYPE]: 'input_type',
};

/** The web app's sorts that system models have values for. */
export const MODEL_SORT_OPTIONS: { value: ModelSortKey; text: string }[] = [
  { value: 'relevant', text: 'Relevance' },
  { value: 'name', text: 'Name' },
  { value: 'family', text: 'Family' },
];

/** Every tool's name in the web app the docs link to, its unified pages on, in its Tools menu order. */
export const TOOL_NAMES: Record<ModelToolKey, string> = {
  de_novo_design: 'Generate',
  train: 'Train',
  score_sequences: 'Batch',
  substitution_analysis: 'Substitutions',
  indel_analysis: 'Indels',
  structure_prediction: 'Structure prediction',
  cluster: 'Cluster',
  hit_selection: 'Hit selection',
};

/** What a model that declares no input type takes. */
const DEFAULT_INPUT_TYPE = 'protein';

/** The API's `multichain` flag, shown and filtered as an input type, first. */
const MULTICHAIN_INPUT_TYPE = 'multichain';

/** Display names where capitalising the API's input type isn't enough. */
const INPUT_TYPE_LABELS: Record<string, string> = {
  dna: 'DNA',
  rna: 'RNA',
  'antibody-vh-vl': 'Antibody VH/VL',
};

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const unique = <T,>(values: T[]) => [...new Set(values)];

/** Cards in the order `/models` lists them, with display names from families. */
export function buildModelCards(models: ModelMetadata[], families: ModelFamilyDoc[] = []): ModelCard[] {
  const familyNames = new Map(families.map((doc) => [doc.id, doc.name]));

  return models.map((model): ModelCard => {
    // Actions aren't inference methods.
    const methods = model.methods.map(cardMethod).filter((method) => method.input && method.output);
    const methodOutputs = unique(methods.map((method) => method.output));
    const inputTypes = unique([
      ...(model.multichain ? [MULTICHAIN_INPUT_TYPE] : []),
      ...(model.input_types?.length ? model.input_types : [DEFAULT_INPUT_TYPE]),
    ]);
    const family = modelFamily(model);
    const familyName =
      family === MODEL_FAMILY_OTHER ? MODEL_FAMILY_OTHER_NAME : (familyNames.get(family)?.trim() || family);
    const info = modelInfo(model, familyName);
    const doi = model.description?.doi?.trim();
    const badges = model.badges ?? [];

    return {
      id: model.model_id,
      name: model.name || model.model_id,
      baseName: model.model?.trim() || model.name || model.model_id,
      isBase: !!model.base,
      version: model.variant?.trim() || model.name || model.model_id,
      recommended: badges.includes('recommended'),
      popular: badges.includes('popular'),
      highlight: badges.includes('highlight'),
      isNew: badges.includes('new'),
      family,
      familyName,
      inputTypes,
      methods,
      methodChips: methodOutputs.map((output) => ({
        output,
        methods: methods.filter((method) => method.output === output),
      })),
      methodOutputs,
      description: modelDescription(model),
      info,
      doiUrl: doiUrl(doi),
      citation: model.description?.citation_title ?? '',
      githubUrl: model.description?.github?.trim() ?? '',
      tools: modelTools(model, methods),
      keywords: modelKeywords(model, methodOutputs.map(methodOutputLabel), inputTypes.map(inputTypeLabel), info),
    };
  });
}

/** Split as the app's `ModelApi` does. */
function cardMethod(method: CatalogueMethod): ModelMethod {
  const path = 'path' in method ? method.path : `${method.input}/${method.output}`;
  const slash = path.indexOf('/');
  const isInference = slash > 0;
  return {
    ...method,
    path,
    input: isInference ? path.slice(0, slash) : '',
    output: isInference ? path.slice(slash + 1) : '',
  };
}

/** The API's own output name, capitalised — never renamed. */
export function methodOutputLabel(output: string) {
  return upperFirst(output);
}

export function inputTypeLabel(type: string) {
  return INPUT_TYPE_LABELS[type] ?? upperFirst(type);
}

/** A link's address without its scheme, e.g. `github.com/facebookresearch/esm`. */
export function linkLabel(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/** `base`, else the first. */
export function defaultVersionOf(versions: ModelCard[]) {
  return versions.find((version) => version.isBase) ?? versions[0];
}

/** One card per base model. */
export function baseModelCards(cards: ModelCard[]) {
  const versions = new Map<string, ModelCard[]>();
  cards.forEach((card) => versions.set(card.baseName, [...(versions.get(card.baseName) ?? []), card]));
  const defaultIds = new Set([...versions.values()].map((list) => defaultVersionOf(list).id));

  return cards.filter((card) => defaultIds.has(card.id));
}

/** The catch-all family sorts last wherever families are listed. */
export function isOtherFamily(family: string) {
  return family === MODEL_FAMILY_OTHER ? 1 : 0;
}

/**
 * The filter facets over `cards`, a facet with nothing to offer left out. An option no card in
 * `candidates` matches alongside the other facets' `filters` is disabled, unless it is selected.
 */
export function modelFilterSections(
  cards: ModelCard[],
  filters: Record<string, string[]> = {},
  candidates = cards,
): ModelFilterSection[] {
  const options = (values: string[], label: (value: string) => string = (value) => value) =>
    unique(values)
      .sort()
      .map((value) => ({ value, text: label(value) }));

  const families = new Map(cards.map((card) => [card.family, card.familyName]));
  const sections: ModelFilterSection[] = [
    {
      key: MODEL_FILTER_FAMILY,
      title: 'Family',
      items: [...families]
        .sort(
          ([a, aName], [b, bName]) =>
            isOtherFamily(a) - isOtherFamily(b) || compareText(aName.toLowerCase(), bName.toLowerCase()),
        )
        .map(([value, text]) => ({ value, text })),
    },
    {
      key: MODEL_FILTER_METHOD_OUTPUT,
      title: 'Outputs',
      items: options(cards.flatMap((card) => card.methodOutputs), methodOutputLabel),
    },
    {
      key: MODEL_FILTER_INPUT_TYPE,
      title: 'Inputs',
      items: options(cards.flatMap((card) => card.inputTypes), inputTypeLabel).sort(
        (a, b) => +(b.value === MULTICHAIN_INPUT_TYPE) - +(a.value === MULTICHAIN_INPUT_TYPE),
      ),
    },
  ];

  return sections
    .filter((section) => section.items.length)
    .map((section) => {
      const selected = filters[section.key] ?? [];
      // Values within a facet are ORed, so its own selection never narrows its own options.
      const open = new Set(
        candidates
          .filter((card) => matchesModelFilters(card, { ...filters, [section.key]: [] }))
          .flatMap((card) => modelFilterValues(card)[section.key] ?? []),
      );

      return {
        ...section,
        items: section.items.map((item) => ({
          ...item,
          disabled: !open.has(item.value) && !selected.includes(item.value),
        })),
      };
    });
}

/** Filter sections are ANDed together, the values within one ORed. */
export function matchesModelFilters(card: ModelCard, filters: Record<string, string[]>) {
  const values = modelFilterValues(card);

  return Object.entries(filters).every(
    ([key, wanted]) =>
      !wanted.length || !values[key] || values[key].some((value) => wanted.includes(value)),
  );
}

/** The search box's match: any searched field containing the query, case-insensitively. */
export function matchesModelSearch(card: ModelCard, query: string) {
  const needle = query.toLowerCase();

  return MODEL_CARD_SEARCH_KEYS.some((key) => {
    const value = card[key];
    return Array.isArray(value)
      ? value.some((item) => item.toLowerCase().includes(needle))
      : value.toLowerCase().includes(needle);
  });
}

/** Relevance keeps the listing's order; Family falls back to the name, so equal keys never shuffle. */
export function sortModelCards(
  cards: ModelCard[],
  sort: ModelSortKey,
  direction: SortDirection,
): ModelCard[] {
  const sign = direction === 'desc' ? -1 : 1;
  const byName = (a: ModelCard, b: ModelCard) => compareText(a.name.toLowerCase(), b.name.toLowerCase());
  const byFamily = (a: ModelCard, b: ModelCard) =>
    compareText(a.familyName.toLowerCase(), b.familyName.toLowerCase());

  switch (sort) {
    case 'name':
      return [...cards].sort((a, b) => sign * byName(a, b));
    case 'family':
      return [...cards].sort((a, b) => sign * (byFamily(a, b) || byName(a, b)));
    default: {
      const list = [...cards];
      return direction === 'desc' ? list.reverse() : list;
    }
  }
}

/** lodash's orderBy order: plain code-unit comparison, not the locale's. */
function compareText(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** A card's values per filter section, which its filters match on. */
function modelFilterValues(card: ModelCard): Record<string, string[]> {
  return {
    [MODEL_FILTER_FAMILY]: [card.family],
    [MODEL_FILTER_METHOD_OUTPUT]: card.methodOutputs,
    [MODEL_FILTER_INPUT_TYPE]: card.inputTypes,
  };
}

/** Searchable metadata; no citation title, no row labels. */
function modelKeywords(
  model: ModelMetadata,
  outputLabels: string[],
  inputTypeLabels: string[],
  info: ModelInfoRow[],
) {
  const measures = [model.max_sequence_length, model.dimension].filter((value) => value > 0);

  return [
    model.model_id,
    model.query,
    ...outputLabels,
    ...inputTypeLabels,
    ...(model.tags ?? []),
    ...info.map((row) => row.value),
    // The info rows group digits — match the bare number too.
    ...measures.map(String),
  ].filter(Boolean) as string[];
}

/**
 * The tools a model's methods unlock, in the Tools menu's order, each opened in the web app on the
 * model (`?model=`). Optimize and Batch analysis need a trained predictor, which no system model is.
 */
function modelTools(model: ModelMetadata, methods: ModelMethod[]): ModelToolLink[] {
  const has = (input: string, outputs: string[]) =>
    methods.some((method) => method.input === input && outputs.includes(method.output));
  const embeds = has('batch', ['embeddings', 'embeddings-reduced']);
  const scores = has('batch', ['loglikelihood']);
  const structures = has('batch', ['structures']);
  const app = (path: string) => `${SITE.appUrl}${path}?model=${encodeURIComponent(model.model_id)}`;
  const available: Record<ModelToolKey, false | string> = {
    de_novo_design: has('generate', ['sequences', 'structures']) && app('/generate'),
    train: embeds && app('/train'),
    score_sequences: scores && app('/predict'),
    substitution_analysis:
      (scores || has('single-site', ['scores', 'predictions'])) && app('/substitutions'),
    // An insertion or deletion no longer fits a model's fixed backbone.
    indel_analysis: scores && model.query !== 'structure' && app('/indel'),
    structure_prediction: structures && app('/fold'),
    cluster: embeds && app('/cluster'),
    hit_selection: embeds && app('/selection'),
  };

  return (Object.keys(available) as ModelToolKey[]).flatMap((key) => {
    const href = available[key];
    return href ? [{ key, text: TOOL_NAMES[key], href }] : [];
  });
}

function modelFamily(model: ModelMetadata) {
  return model.family_id?.trim() || MODEL_FAMILY_OTHER;
}

/** A summary that only repeats the name adds nothing the card doesn't show already. */
function modelDescription(model: ModelMetadata) {
  const summary = model.description?.summary?.trim() ?? '';

  return summary === model.name?.trim() ? '' : summary;
}

/** Dimension and length are reported as -1 by the models they don't apply to. */
function modelInfo(model: ModelMetadata, familyName: string) {
  const info: ModelInfoRow[] = [{ label: 'Family', value: familyName }];

  if (model.max_sequence_length > 0) {
    info.push({ label: 'Max length', value: NUMBER_FORMAT.format(model.max_sequence_length) });
  }

  if (model.dimension > 0) {
    info.push({ label: 'Dimension', value: NUMBER_FORMAT.format(model.dimension) });
  }

  return info;
}

/** The API's `doi` is sometimes a bare DOI, sometimes already a full paper URL. */
function doiUrl(doi?: string) {
  if (!doi) return '';

  return /^https?:\/\//.test(doi) ? doi : `https://doi.org/${doi}`;
}

