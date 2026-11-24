import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// GitHub's schema: tables with their spans and alignment survive; scripts, handlers, styles,
// forms and non-http(s) URLs do not.
const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze();

export function sanitizeHtml(html: string): string {
  return String(processor.processSync(html));
}
