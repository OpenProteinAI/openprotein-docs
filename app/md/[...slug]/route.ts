import { notFound } from 'next/navigation';
import { endpointsMarkdown, getModelEndpoints } from '@/lib/model-api';
import {
  baseModelMarkdown,
  getBaseModel,
  getBaseModels,
  getModelFamilyDocs,
  getSystemModels,
  modelsMarkdown,
  versionMarkdown,
} from '@/lib/models';
import { MODELS_DESCRIPTION, MODELS_TITLE, MODELS_URL, modelPageUrl, versionPageUrl } from '@/lib/models-tree';
import { source } from '@/lib/source';
import { pageText } from '@/lib/page-text';
import { SITE } from '@/lib/site';

/**
 * The page as plain markdown, for "Copy as Markdown" and for anyone piping a page into an LLM.
 * `proxy.ts` rewrites `/<path>.md` here, which is the URL that tooling expects.
 *
 * Body comes from lib/page-text.ts, so notebook, Python API and REST pages carry their
 * request-time content rather than an empty wrapper.
 */
export async function GET(_request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  if (slug.join('/') === `${MODELS_URL.slice(1)}.md`) return markdown(await modelsPage());
  if (slug.length === 2 && slug[0] === MODELS_URL.slice(1)) {
    const view = await getBaseModel(slug[1].replace(/\.md$/, ''));
    if (!view) notFound();
    const endpoints = endpointsMarkdown(view.versions, await getModelEndpoints(view.versions.map((card) => card.id)));
    return markdown(
      [
        `# ${view.name}`,
        `URL: ${SITE.url}${modelPageUrl(view.id)}`,
        view.summary ? `\n${view.summary}` : null,
        `\n${baseModelMarkdown(view, endpoints)}`,
      ]
        .filter((line) => line !== null)
        .join('\n'),
    );
  }

  if (slug.length === 3 && slug[0] === MODELS_URL.slice(1)) {
    const view = await getBaseModel(slug[1]);
    const version = slug[2].replace(/\.md$/, '');
    const card = view?.versions.find((candidate) => version && view.versionSlugs[candidate.id] === version);
    if (!view || !card) notFound();
    const endpoints = endpointsMarkdown([card], await getModelEndpoints([card.id]));
    return markdown(
      [
        `# ${card.name}`,
        `URL: ${SITE.url}${versionPageUrl(view, card.id)}`,
        card.description ? `\n${card.description}` : null,
        `\n${versionMarkdown(card, endpoints)}`,
      ]
        .filter((line) => line !== null)
        .join('\n'),
    );
  }

  // The export writes one file per page, so the leaf carries `.md` to keep it from colliding
  // with the directory of the same name. proxy.ts rewrites to the suffix-less form.
  const page = source.getPage([...slug.slice(0, -1), slug[slug.length - 1].replace(/\.md$/, '')]);
  if (!page) notFound();

  const body = [
    `# ${page.data.title ?? page.url}`,
    `URL: ${SITE.url}${page.url}`,
    page.data.description ? `\n${page.data.description}` : null,
    `\n${await pageText(page)}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return markdown(body);
}

function markdown(body: string) {
  return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}

/** /models is built in code, not MDX, so its text comes from the catalogue itself. */
async function modelsPage() {
  const [models, families] = await Promise.all([getSystemModels(), getModelFamilyDocs()]);
  return [
    `# ${MODELS_TITLE}`,
    `URL: ${SITE.url}${MODELS_URL}`,
    `\n${MODELS_DESCRIPTION}`,
    `\n${models ? modelsMarkdown(models, families) : "The model catalogue couldn't be loaded from the platform."}`,
  ].join('\n');
}

export async function generateStaticParams() {
  return [
    ...source
      .generateParams()
      .filter(({ slug }) => slug.length > 0)
      .map(({ slug }) => ({ slug: [...slug.slice(0, -1), `${slug[slug.length - 1]}.md`] })),
    { slug: [`${MODELS_URL.slice(1)}.md`] },
    ...(await getBaseModels()).flatMap((view) => [
      { slug: [MODELS_URL.slice(1), `${view.id}.md`] },
      ...Object.values(view.versionSlugs)
        .filter(Boolean)
        .map((version) => ({ slug: [MODELS_URL.slice(1), view.id, `${version}.md`] })),
    ]),
  ];
}
