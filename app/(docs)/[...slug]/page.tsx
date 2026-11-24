import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/notebook/page';
import { TOCPopover, TOCProvider } from 'fumadocs-ui/layouts/notebook/page/slots/toc';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/components/mdx';
import { NotebookBadges } from '@/components/notebook/badges';
import { NotebookView } from '@/components/notebook/notebook-view';
import { PySdkVersion } from '@/components/python-api/sdk-version';
import { OpenAPIPage } from '@/components/api-page';
import { LiveOpenAPIPage } from '@/components/rest-api/live-openapi-page';
import { SessionScoped } from '@/components/auth/session-scoped';
import { PageActions } from '@/components/site/page-actions';
import { PageDescription } from '@/components/site/page-description';
import { PageToc } from '@/components/site/page-toc';
import {
  TutorialClientPanes,
  TutorialClientToggle,
  TutorialClientTOCProvider,
  type ClientTOCItem,
} from '@/components/site/tutorial-client';
import { readNotebook } from '@/lib/notebook';
import { getApiPageProps, getSpecDocument, specIdForSlug } from '@/lib/openapi';
import { endpointsToc } from '@/lib/openapi-toc';
import { pyToc } from '@/lib/python-api';
import { descriptionText } from '@/lib/description';
import { bodyRepeatsDescription } from '@/lib/page-lead';
import { source } from '@/lib/source';
import { SITE } from '@/lib/site';
import type { TutorialClient } from '@/lib/tutorial-client';

const ids = (toc: { url: string }[]) => toc.map((item) => decodeURIComponent(item.url.slice(1)));
const tagged = (toc: ClientTOCItem[], client: TutorialClient) => toc.map((item) => ({ ...item, client }));

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const description = page.data.description;
  const notebook = page.data.notebook;
  const appToc = notebook && page.data.duoContent ? page.data.toc : null;
  const specId = page.data.openapi ? specIdForSlug(slug.at(-1) ?? '') : undefined;
  const components = getMDXComponents({ a: createRelativeLink(source, page) });

  // Notebook headings live in the .ipynb, so the page TOC is the wrapper's plus the
  // notebook's - otherwise the whole notebook body is unnavigable.
  let toc: ClientTOCItem[] = page.data.toc;
  let pythonToc: ClientTOCItem[] = [];
  if (notebook && appToc) {
    // The page prints the title; the notebook's headings step down under it.
    const nbToc = (await readNotebook(notebook)).toc;
    pythonToc = (nbToc[0]?.depth === 1 ? nbToc.slice(1) : nbToc).map((item) => ({ ...item, depth: item.depth + 1 }));
    toc = [...tagged(appToc, 'app'), ...tagged(pythonToc, 'python')];
  } else if (notebook) toc = [...toc, ...(await readNotebook(notebook)).toc];
  if (specId) toc = [...toc, ...endpointsToc(await getSpecDocument(specId))];
  // <PyClass> blocks render at request time, so the compile-time TOC sees only this page's
  // own headings and every class under them would be unnavigable.
  if (page.data.pythonApi) toc = await pyToc(page.path, toc);

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      // includeRoot: each section's meta.json is `root: true`, and without this the section
      // name drops out of the breadcrumb along with the rest of the tree above it. A section's
      // landing page, its only one-segment slug, has none.
      breadcrumb={{ enabled: slug.length > 1, includePage: true, includeRoot: true }}
      // fd-page-footer is the styling hook global.css hangs the prev/next hover on;
      // the slot has no data-card or id of its own.
      footer={{ enabled: true, className: 'fd-page-footer' }}
      // single: collapsed endpoints are short enough that a dozen clear the intersection
      // threshold at once and the whole TOC lights up.
      tableOfContent={{ single: Boolean(specId), footer: <PageActions path={page.path} url={page.url} notebook={notebook} /> }}
      // PageToc hides the heading list on the pages that have no headings.
      slots={{
        toc: { provider: appToc ? TutorialClientTOCProvider : TOCProvider, main: PageToc, popover: TOCPopover },
      }}
    >
      {notebook && !appToc ? null : (
        <>
          {page.data.pythonApi || appToc ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <DocsTitle className="text-2xl tracking-tight">{page.data.title}</DocsTitle>
              {appToc ? <TutorialClientToggle /> : <PySdkVersion />}
            </div>
          ) : (
            <DocsTitle className="text-2xl tracking-tight">{page.data.title}</DocsTitle>
          )}
          {/* A page whose body already opens with its description would print the same
              sentence twice, one line apart — true of the Python API reference pages by
              construction, and of 25 migrated prose pages because the converter derives the
              description from their opening sentence. The description still feeds <meta>, the
              prev/next cards and search either way. See lib/page-lead.ts. */}
          {page.data.pythonApi || appToc || !description || (await bodyRepeatsDescription(page)) ? null : (
            /* fumadocs' mb-8 stacks on the article's gap-4 into a 3rem hole; mb-0 leaves just
               the gap, matching what an h2 puts above its first paragraph, and -mt-4 cancels it
               above so only the two line-boxes' leading separates the lead from the title.
               Their text-lg drops to body copy. */
            <DocsDescription className="-mt-4 mb-0 text-base leading-prose italic text-[color:var(--color-fd-description)]">
              <PageDescription>{description}</PageDescription>
            </DocsDescription>
          )}
        </>
      )}
      <DocsBody>
        {notebook && appToc ? (
          <TutorialClientPanes
            app={<MDX components={components} />}
            python={
              <>
                <NotebookBadges file={notebook} />
                <NotebookView file={notebook} headingShift={1} untitled />
              </>
            }
            ids={{ app: ids(appToc), python: ids(pythonToc) }}
          />
        ) : (
          <>
            {notebook ? <NotebookBadges file={notebook} /> : null}
            <MDX components={components} />
            {notebook ? <NotebookView file={notebook} /> : null}
          </>
        )}
        {specId ? (
          <SessionScoped>
            {specId === 'prompt' || specId === 'models' ? (
              <LiveOpenAPIPage key={specId} specId={specId} fallback={await getApiPageProps(specId)} />
            ) : (
              <OpenAPIPage {...(await getApiPageProps(specId))} />
            )}
          </SessionScoped>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams().filter((params) => params.slug.length > 0);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const canonical = `${SITE.url}${page.url}`;
  const image = `/og/${page.slugs.join('/')}/image.png`;
  return {
    title: page.data.title,
    description: descriptionText(page.data.description),
    alternates: { canonical },
    openGraph: { url: canonical, images: image },
    twitter: { card: 'summary_large_image', images: image },
  };
}
