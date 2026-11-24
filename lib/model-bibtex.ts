// A model's paper as BibTeX, from its DOI: doi.org answers any DOI with BibTeX on request.

const DOI_URL = /^https?:\/\/(?:www\.|dx\.)?doi\.org\/(10\.\S+)$/i;

const papers = new Map<string, Promise<string | null>>();

/** The paper's BibTeX, asked of doi.org once per DOI URL; null if it isn't a DOI or doesn't resolve. */
export function paperBibtex(doiUrl: string): Promise<string | null> {
  const doi = DOI_URL.exec(doiUrl)?.[1];
  if (!doi) return Promise.resolve(null);

  let paper = papers.get(doiUrl);
  if (!paper) {
    paper = oneAtATime(() => fetchBibtex(doi)).then((bibtex) => {
      // A failure isn't kept, so picking the version again retries.
      if (bibtex === null) papers.delete(doiUrl);
      return bibtex;
    });
    papers.set(doiUrl, paper);
  }
  return paper;
}

async function fetchBibtex(doi: string): Promise<string | null> {
  try {
    const response = await fetch(`https://doi.org/${doi}`, { headers: { Accept: 'application/x-bibtex' } });
    return response.ok ? formatBibtex(await response.text()) : null;
  } catch {
    return null;
  }
}

// doi.org hands off to Crossref, which refuses concurrent requests from one client with a 429.
let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/** One field per line: doi.org answers with the whole entry on one. Null for anything but one entry. */
export function formatBibtex(source: string): string | null {
  const text = source.trim();
  const head = /^@(\w+)\s*\{\s*([^,\s]*)\s*,/.exec(text);
  if (!head) return null;

  const fields: string[] = [];
  let depth = 0;
  let quoted = false;
  let start = head[0].length;
  let end = -1;
  for (let i = start; i < text.length && end < 0; i++) {
    const char = text[i];
    if (char === '\\') i++;
    else if (char === '"' && depth === 0) quoted = !quoted;
    else if (char === '{') depth++;
    else if (char === '}' && depth > 0) depth--;
    else if (char === '}') end = i;
    else if (char === ',' && depth === 0 && !quoted) {
      fields.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (end < 0 || text.slice(end + 1).trim()) return null;
  fields.push(text.slice(start, end).trim());

  return `@${head[1]}{${head[2]},\n${fields
    .filter(Boolean)
    .map((field) => `  ${field}`)
    .join(',\n')}\n}`;
}
