import 'server-only';

/**
 * Does the page body already open with its own `description`?
 *
 * `scripts/rst2mdx.py` derives a page's `description` from the first sentence of its opening
 * paragraph, because the old RST had no frontmatter to take one from. That is the right text for
 * `<meta name="description">`, the prev/next cards and search — but rendering it *also* as the
 * visible `<DocsDescription>` subtitle prints the same sentence twice, one line apart, on 25 of
 * the migrated pages.
 *
 * Phase 7 hit this on the Python API reference pages and suppressed the subtitle there rather
 * than editing the body, because the opening paragraph carries cross-links the description
 * cannot. The same reasoning holds for the prose pages, and on 20 of the 25 the description is
 * only the *first sentence* of a longer paragraph — trimming the body would leave prose starting
 * mid-thought, or drop the links in the remainder.
 *
 * So: keep the paragraph, drop the duplicate subtitle. Pages whose description says something
 * the body does not are unaffected and still show it.
 */
export async function bodyRepeatsDescription(page: {
  data: { description?: string; getText?: (kind: 'processed' | 'raw') => Promise<string> };
}): Promise<boolean> {
  const description = page.data.description?.trim();
  if (!description || !page.data.getText) return false;

  let body: string;
  try {
    body = await page.data.getText('processed');
  } catch {
    return false;
  }

  const normalise = (text: string) =>
    text
      // Link syntax, emphasis and inline code are formatting, not words: the description is
      // plain text and the body's copy of the same sentence usually is not.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // The duplicated sentence is the first *prose paragraph*, which is not always the first
  // block: `web-app/poet/prompts` opens with `## What is a Prompt?` and repeats its description
  // in the paragraph below. Skip leading headings and JSX, then compare that paragraph.
  const lead = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !/^(#{1,6}\s|<|\{|import\s|export\s|:{3}|\|)/.test(block));
  if (!lead) return false;

  const wanted = normalise(description);
  const found = normalise(lead).slice(0, wanted.length);
  return wanted.length > 0 && found === wanted;
}
