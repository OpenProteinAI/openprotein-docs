import type { Metadata } from 'next';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DocsPage } from 'fumadocs-ui/layouts/notebook/page';
import { TOCPopover, TOCProvider } from 'fumadocs-ui/layouts/notebook/page/slots/toc';
import { SessionScoped } from '@/components/auth/session-scoped';
import { ModelOpenAPIPage } from '@/components/models/model-page/model-openapi-page';
import { ModelPage } from '@/components/models/model-page/model-page';
import { PageMarkdownActions } from '@/components/site/page-actions';
import { PageToc } from '@/components/site/page-toc';
import type { BaseModelView } from '@/lib/base-models';
import { getModelApiPageProps, getModelEndpoints } from '@/lib/model-api';
import type { ModelCard } from '@/lib/model-cards';
import { versionPageUrl } from '@/lib/models-tree';
import { SITE } from '@/lib/site';

/** One version's page, its endpoints rendered on the server. */
export async function ModelRoute({ view, card }: { view: BaseModelView; card: ModelCard }) {
  const endpoints = await getModelEndpoints([card.id]);
  const [run, results] = await Promise.all([
    Promise.all(endpoints.run.map(getModelApiPageProps)),
    Promise.all(endpoints.results.map(getModelApiPageProps)),
  ]);

  const toc: TOCItemType[] = [
    view.versions.length > 1 ? ['Model versions', 'model-versions'] : null,
    run.length ? ['Endpoints', 'endpoints'] : null,
    card.citation ? ['Citation', 'citation'] : null,
  ]
    .filter((entry) => entry !== null)
    .map(([title, id]) => ({ title, url: `#${id}`, depth: 2 }));

  return (
    // The docs pages' frame, less prev/next: the sidebar's neighbours aren't a reading order.
    <DocsPage
      toc={toc}
      breadcrumb={{ enabled: true, includePage: true, includeRoot: true }}
      footer={{ enabled: false }}
      // The docs pages' rail: the sections, then the page actions under them.
      tableOfContent={{ footer: <PageMarkdownActions url={versionPageUrl(view, card.id)} /> }}
      slots={{ toc: { provider: TOCProvider, main: PageToc, popover: TOCPopover } }}
    >
      <ModelPage
        view={view}
        card={card}
        endpoints={
          run.length ? (
            // Keyed: it lands in a list there.
            <SessionScoped key="endpoints">
              <div className="flex flex-col gap-2">
                {run.map((props, index) => (
                  <ModelOpenAPIPage key={endpoints.run[index].specId} {...props} />
                ))}
                <h3 className="om-subsection-title">Get results</h3>
                <p className="om-section-lead mb-2">
                  Each request above starts a job and answers with its <code className="om-code">job_id</code>. Poll the job
                  until its status reads <code className="om-code">SUCCESS</code>, then read its output.
                </p>
                {results.map((props, index) => (
                  <ModelOpenAPIPage key={endpoints.results[index].specId} {...props} />
                ))}
              </div>
            </SessionScoped>
          ) : undefined
        }
      />
    </DocsPage>
  );
}

/** The base page names the base model; a version's, the version. */
export function modelMetadata(view: BaseModelView, card: ModelCard): Metadata {
  const url = versionPageUrl(view, card.id);
  const isBase = card.id === view.defaultVersion;
  const canonical = `${SITE.url}${url}`;
  const image = `/og${url}/image.png`;

  return {
    title: isBase ? view.name : card.name,
    description: isBase ? view.summary : card.description.replaceAll('\n\n', ' '),
    alternates: { canonical },
    openGraph: { url: canonical, images: image },
    twitter: { card: 'summary_large_image', images: image },
  };
}
