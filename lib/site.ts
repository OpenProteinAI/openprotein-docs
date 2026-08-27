export const SITE = {
  /** Absolute origin for canonical URLs, the sitemap, robots and OG images. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.openprotein.ai').replace(/\/$/, ''),
  repo: 'https://github.com/OpenProteinAI/openprotein-docs',
  /** Branch the content lives on. Change to `develop` once this branch merges. */
  ref: process.env.NEXT_PUBLIC_CONTENT_REF ?? 'phap/new-docs',
  feedback: 'https://github.com/OpenProteinAI/openprotein-docs/issues/new',
  gaId: process.env.NEXT_PUBLIC_GA_ID,
};

export function editUrl(path: string) {
  return `${SITE.repo}/blob/${SITE.ref}/content/docs/${path}`;
}

export function notebookUrl(file: string) {
  return `${SITE.repo}/blob/${SITE.ref}/content/notebooks/${file}`;
}

/** `owner/repo`, for services that take a slug rather than a URL. */
export const REPO_SLUG = SITE.repo.replace('https://github.com/', '');
