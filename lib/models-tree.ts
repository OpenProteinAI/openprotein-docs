import type { ReactNode } from 'react';
import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import { baseModelViews, type BaseModelView } from '@/lib/base-models';
import type { ModelMetadata } from '@/lib/model-cards';
import type { ModelFamilyDoc } from '@/lib/model-families';

export const MODELS_URL = '/models';
export const MODELS_TITLE = 'Models';
export const MODELS_OVERVIEW = 'Overview';
export const MODELS_DESCRIPTION =
  'Explore models for protein design, including protein language models, structure predictors, sequence and structure generators, and more. Search by text or keywords, or filter by family, output, and/or input.';

/** `$id` prefix of a base model's folder: its versions' pages, shown as one entry. */
const VERSIONS_FOLDER = 'models-versions:';

/** A base model's page, by its slug. */
export function modelPageUrl(id: string) {
  return `${MODELS_URL}/${id}`;
}

/** A version's page: the base model's for its default, else one under it. */
export function versionPageUrl(view: BaseModelView, versionId: string) {
  const slug = view.versionSlugs[versionId];
  return slug ? `${modelPageUrl(view.id)}/${slug}` : modelPageUrl(view.id);
}

export function isVersionsFolder(node: Node) {
  return node.type === 'folder' && !!node.$id?.startsWith(VERSIONS_FOLDER);
}

/**
 * The site tree plus a `root: true` Models section, so the sidebar shows only it on /models: the
 * overview, then one entry per base model, named by `label`. A base model with several versions
 * is a folder of their pages, so the sidebar and breadcrumb find them; it renders as one entry.
 */
export function withModelsSection(
  tree: Root,
  docs: ModelFamilyDoc[],
  models: ModelMetadata[] = [],
  label: (view: BaseModelView) => ReactNode = (view) => view.name,
): Root {
  const entries = baseModelViews(models, docs).map((view): Item | Folder => {
    const page: Item = { $id: `models-base:${view.id}`, type: 'page', name: label(view), url: modelPageUrl(view.id) };
    if (view.versions.length < 2) return page;

    return {
      $id: `${VERSIONS_FOLDER}${view.id}`,
      type: 'folder',
      name: page.name,
      index: page,
      children: view.versions
        .filter((card) => card.id !== view.defaultVersion)
        .map((card) => ({
          $id: `models-version:${card.id}`,
          type: 'page',
          name: card.version,
          url: versionPageUrl(view, card.id),
        })),
    };
  });

  return {
    ...tree,
    children: [
      ...tree.children,
      {
        $id: 'models',
        type: 'folder',
        name: MODELS_TITLE,
        root: true,
        // A child, not `index`: the sidebar lists a root folder's children only.
        children: [{ $id: 'models:index', type: 'page', name: MODELS_OVERVIEW, url: MODELS_URL }, ...entries],
      },
    ],
  };
}
