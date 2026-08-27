export const SITE = {
  /** Absolute origin for canonical URLs, the sitemap, robots and OG images. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.openprotein.ai').replace(/\/$/, ''),
  repo: 'https://github.com/OpenProteinAI/openprotein-docs',
  branch: 'develop',
  notebookRef: process.env.NEXT_PUBLIC_NOTEBOOK_REF ?? 'develop',
  notebookRoot: process.env.NEXT_PUBLIC_NOTEBOOK_ROOT ?? 'source',
  feedback: 'https://github.com/OpenProteinAI/openprotein-docs/issues/new',
  gaId: process.env.NEXT_PUBLIC_GA_ID,
};

export function editUrl(path: string) {
  return `${SITE.repo}/blob/${SITE.branch}/content/docs/${path}`;
}

export function notebookUrl(file: string) {
  return `${SITE.repo}/blob/${SITE.notebookRef}/${SITE.notebookRoot}/${file}`;
}
