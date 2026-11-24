/** `text` with its case-insensitive matches of `query` marked, as the app's highlightTextMatch(). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;

  // The capture group keeps each match in the split, at the odd indexes.
  const parts = text.split(new RegExp(`(${searchPattern(needle)})`, 'gi'));
  return parts.map((part, index) =>
    index % 2 ? (
      <mark key={index} className="om-hl">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** Numbers are rendered comma-grouped, so a bare-number query still has to mark them. */
function searchPattern(needle: string) {
  if (!/^\d+$/.test(needle)) return needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return needle.split('').join(',?');
}
