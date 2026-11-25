import type { Metadata } from 'next';
import { DocsPage } from 'fumadocs-ui/layouts/notebook/page';
import { ModelCatalog } from '@/components/models/model-catalog';
import { PageMarkdownActions } from '@/components/site/page-actions';
import { baseModelViews } from '@/lib/base-models';
import { buildModelCards } from '@/lib/model-cards';
import { getModelFamilyDocs, getSystemModels } from '@/lib/models';
import { MODELS_DESCRIPTION, MODELS_TITLE, MODELS_URL, versionPageUrl } from '@/lib/models-tree';
import { SITE } from '@/lib/site';

export default async function ModelsPage() {
  const [models, families] = await Promise.all([getSystemModels(), getModelFamilyDocs()]);
  const pages = Object.fromEntries(
    baseModelViews(models ?? [], families).flatMap((view) =>
      view.versions.map((card) => [card.id, versionPageUrl(view, card.id)]),
    ),
  );

  return (
    // No TOC rail, so the grid takes its width; the page actions sit in the header instead. No
    // prev/next either: the sidebar's other entries are filters of this page.
    <DocsPage
      full
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
      tableOfContent={{ enabled: false }}
      tableOfContentPopover={{ enabled: false }}
    >
      <ModelCatalog
        title={MODELS_TITLE}
        description={MODELS_DESCRIPTION}
        actions={<PageMarkdownActions url={MODELS_URL} align="end" />}
        cards={models ? buildModelCards(models, families) : null}
        pages={pages}
      />
    </DocsPage>
  );
}

const canonical = `${SITE.url}${MODELS_URL}`;
const image = `/og${MODELS_URL}/image.png`;

export const metadata: Metadata = {
  title: MODELS_TITLE,
  description: MODELS_DESCRIPTION,
  alternates: { canonical },
  openGraph: { url: canonical, images: image },
  twitter: { card: 'summary_large_image', images: image },
};
