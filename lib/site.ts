export const SITE = {
  /** Absolute origin for canonical URLs, the sitemap, robots and OG images. */
  url: (process.env.NEXT_PUBLIC_OP_SITE_URL ?? 'https://docs.openprotein.ai').replace(/\/$/, ''),
  /** Repo the content lives in. Public `openprotein-docs` in production. */
  repo: (
    process.env.NEXT_PUBLIC_OP_REPO || 'https://github.com/OpenProteinAI/openprotein-docs'
  ).replace(/\/$/, ''),
  /** Branch the content lives on, for "Open in GitHub" and the notebook badges. */
  ref: process.env.NEXT_PUBLIC_OP_REPO_BRANCH ?? 'main',
  gaId: process.env.NEXT_PUBLIC_OP_GA_ID,
  /** The web app: the header links to it, and docs sign-in goes through it. */
  appUrl: (process.env.NEXT_PUBLIC_OP_APP_URL || 'https://app.openprotein.ai').replace(/\/+$/, ''),
};

export function editUrl(path: string) {
  return `${SITE.repo}/blob/${SITE.ref}/content/docs/${path}`;
}

export function notebookUrl(file: string) {
  return `${SITE.repo}/blob/${SITE.ref}/content/notebooks/${file}`;
}

/** The generated reference sections. Python API links in the specs are baked with the same base
 *  by scripts/pyapi, so change both together. */
export const REST_API_URL = '/references/rest-api';
export const PY_API_URL = '/references/python-api';

export const FEEDBACK_URL = `${SITE.repo}/issues/new`;

/** `owner/repo`, for services that take a slug rather than a URL. */
export const REPO_SLUG = SITE.repo.replace('https://github.com/', '');
