export const SITE = {
  repo: 'https://github.com/OpenProteinAI/openprotein-docs',
  branch: 'develop',
  feedback: 'https://github.com/OpenProteinAI/openprotein-docs/issues/new',
  gaId: process.env.NEXT_PUBLIC_GA_ID,
};

export function editUrl(path: string) {
  return `${SITE.repo}/blob/${SITE.branch}/content/docs/${path}`;
}

export function notebookUrl(file: string) {
  return `${SITE.repo}/blob/${SITE.branch}/content/notebooks/${file}`;
}
