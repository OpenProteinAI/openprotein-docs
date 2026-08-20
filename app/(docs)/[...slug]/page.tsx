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
import { source } from '@/lib/source';

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

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      breadcrumb={{ enabled: true, includePage: true }}
      footer={{ enabled: true }}
      // single: collapsed endpoints are short enough that a dozen clear the intersection
      // threshold at once and the whole TOC lights up.
      tableOfContent={{ single: Boolean(specId), footer: <PageActions path={page.path} notebook={notebook} /> }}
    >
      {notebook ? null : (
        <>
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription>{page.data.description}</DocsDescription>
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

  return { title: page.data.title, description: page.data.description };
}
