import 'server-only';

/**
 * The converter derives `description` from the opening sentence, so 25 pages would print it
 * twice — once as the subtitle, once as prose. Drop the subtitle, keep the paragraph: on 20 of
 * them the description is only the first sentence of a longer one.
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

  // The description is plain text; the body's copy of it usually is not.
  const normalise = (text: string) =>
    text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Not always the first block — `web-app/poet/prompts` opens with a heading.
  const lead = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !/^(#{1,6}\s|<|\{|import\s|export\s|:{3}|\|)/.test(block));
  if (!lead) return false;

  const wanted = normalise(description);
  const found = normalise(lead).slice(0, wanted.length);
  return wanted.length > 0 && found === wanted;
}
