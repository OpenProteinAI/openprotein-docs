import { buildModelCards, defaultVersionOf, type ModelCard, type ModelMetadata } from '@/lib/model-cards';
import type { ModelFamilyDoc } from '@/lib/model-families';

/** A base model as its page renders it, e.g. ESM2 and its five sizes. */
export interface BaseModelView {
  /** The page's URL segment. */
  id: string;
  name: string;
  /** The paragraph its versions share. */
  summary: string;
  /** In the API's order. */
  versions: ModelCard[];
  /** The version the page opens on. */
  defaultVersion: string;
  /** Per version id, its page's segment under the base model's; the default's is empty. */
  versionSlugs: Record<string, string>;
}

/** `ESM2` → `esm2`, `ESM1v-2` → `esm1v-2`. */
export function modelSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A version's description less the paragraph its base model's versions share. */
export function versionDescription(card: ModelCard) {
  return card.description.split('\n\n').slice(1).join('\n\n');
}

/** One view per base model, in the order its first card comes in `/models`. */
export function baseModelViews(models: ModelMetadata[], families: ModelFamilyDoc[] = []): BaseModelView[] {
  const bases = new Map<string, ModelCard[]>();
  buildModelCards(models, families).forEach((card) => {
    bases.set(card.baseName, [...(bases.get(card.baseName) ?? []), card]);
  });

  return [...bases].map(([name, versions]) => {
    const base = defaultVersionOf(versions);
    return {
      id: modelSlug(name),
      name,
      summary: base.description.split('\n\n')[0],
      versions,
      defaultVersion: base.id,
      versionSlugs: versionSlugs(versions, base.id),
    };
  });
}

/** By version label (`8m`), or by model id where two labels slug alike. */
function versionSlugs(versions: ModelCard[], defaultId: string) {
  const labels = versions.map((card) => modelSlug(card.version));
  return Object.fromEntries(
    versions.map((card, i) => {
      if (card.id === defaultId) return [card.id, ''];
      const unique = labels.indexOf(labels[i]) === labels.lastIndexOf(labels[i]);
      return [card.id, unique ? labels[i] : modelSlug(card.id)];
    }),
  );
}
