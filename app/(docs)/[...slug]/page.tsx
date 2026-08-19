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
import { PageActions } from '@/components/site/page-actions';
import { readNotebook } from '@/lib/notebook';
import { source } from '@/lib/source';

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const notebook = page.data.notebook;
  const components = getMDXComponents({ a: createRelativeLink(source, page) });

  // Notebook headings live in the .ipynb, so the page TOC is the wrapper's plus the
  // notebook's - otherwise the whole notebook body is unnavigable.
  const toc = notebook ? [...page.data.toc, ...(await readNotebook(notebook)).toc] : page.data.toc;

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      breadcrumb={{ enabled: true, includePage: true }}
      footer={{ enabled: true }}
      tableOfContent={{ footer: <PageActions path={page.path} notebook={notebook} /> }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {notebook ? <NotebookBadges file={notebook} /> : null}
        <MDX components={components} />
        {notebook ? <NotebookView file={notebook} /> : null}
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
