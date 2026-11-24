/**
 * A frontmatter `description` may carry markdown links. Only the lead under the page title
 * renders them — `<meta>`, the OG image, search results and the prev/next cards are all plain
 * text, and printed the link syntax verbatim. Links only: no other inline markdown is parsed,
 * so a description that wants emphasis still has to say it in words.
 */

/** `[text](/href)`, with the optional title markdown allows after the href. */
const LINK = /\[([^\]]+)\]\([ \t]*<?([^)\s>]+)>?(?:[ \t]+"[^"]*")?[ \t]*\)/g;

export type DescriptionPart = { text: string; href?: string };

/** The description split into its plain runs and its links, in order. */
export function descriptionParts(description: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  let at = 0;
  for (const match of description.matchAll(LINK)) {
    if (match.index > at) parts.push({ text: description.slice(at, match.index) });
    parts.push({ text: match[1], href: match[2] });
    at = match.index + match[0].length;
  }
  if (at < description.length) parts.push({ text: description.slice(at) });
  return parts;
}

/** The same sentence with its links flattened to their text. */
export function descriptionText(description: string): string;
export function descriptionText(description: string | undefined): string | undefined;
export function descriptionText(description?: string): string | undefined {
  if (!description) return description;
  return descriptionParts(description)
    .map((part) => part.text)
    .join('');
}
