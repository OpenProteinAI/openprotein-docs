import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/notebook/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/components/mdx';
import { NotebookBadges } from '@/components/notebook/badges';
import { NotebookView } from '@/components/notebook/notebook-view';
import { OpenAPIPage } from '@/components/api-page';
import { PageActions } from '@/components/site/page-actions';
import { readNotebook } from '@/lib/notebook';
import { getApiPageProps, getSpecDocument, specIdForSlug } from '@/lib/openapi';
import { endpointsToc } from '@/lib/openapi-toc';
import { pyToc } from '@/lib/python-api';
import { bodyRepeatsDescription } from '@/lib/page-lead';
import { source } from '@/lib/source';
import { SITE } from '@/lib/site';

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const notebook = page.data.notebook;
  const specId = page.data.openapi ? specIdForSlug(slug.at(-1) ?? '') : undefined;
  const components = getMDXComponents({ a: createRelativeLink(source, page) });

  // Notebook headings live in the .ipynb, so the page TOC is the wrapper's plus the
  // notebook's - otherwise the whole notebook body is unnavigable.
  let toc = page.data.toc;
  if (notebook) toc = [...toc, ...(await readNotebook(notebook)).toc];
  if (specId) toc = [...toc, ...endpointsToc(await getSpecDocument(specId))];
  // <PyClass> blocks render at request time, so the compile-time TOC sees only this page's
  // own headings and every class under them would be unnavigable.
  if (page.data.pythonApi) toc = await pyToc(page.path, toc);

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      // includeRoot: each section's meta.json is `root: true`, and without this the section
      // name drops out of the breadcrumb along with the rest of the tree above it.
      breadcrumb={{ enabled: true, includePage: true, includeRoot: true }}
      footer={{ enabled: true }}
      // single: collapsed endpoints are short enough that a dozen clear the intersection
      // threshold at once and the whole TOC lights up.
      tableOfContent={{ single: Boolean(specId), footer: <PageActions path={page.path} notebook={notebook} /> }}
    >
      {notebook ? null : (
        <>
          <DocsTitle>{page.data.title}</DocsTitle>
          {/* A page whose body already opens with its description would print the same
              sentence twice, one line apart — true of the Python API reference pages by
              construction, and of 25 migrated prose pages because the converter derives the
              description from their opening sentence. The description still feeds <meta>, the
              prev/next cards and search either way. See lib/page-lead.ts. */}
          {page.data.pythonApi || (await bodyRepeatsDescription(page)) ? null : (
            <DocsDescription>{page.data.description}</DocsDescription>
          )}
        </>
      )}
      <DocsBody>
        {notebook ? <NotebookBadges file={notebook} /> : null}
        <MDX components={components} />
        {notebook ? <NotebookView file={notebook} /> : null}
        {specId ? <OpenAPIPage {...(await getApiPageProps(specId))} /> : null}
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
    description: page.data.description,
    alternates: { canonical },
    openGraph: { url: canonical, images: image },
    twitter: { card: 'summary_large_image', images: image },
  };
}
