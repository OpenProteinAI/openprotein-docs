import { Fragment } from 'react';
import Link from 'fumadocs-core/link';
import { descriptionParts } from '@/lib/description';

/**
 * The lead under the page title, with the markdown links a description may carry. The same
 * Link the body's `a` resolves to, so an internal link routes client-side and an external one
 * opens in a new tab — hrefs are site-absolute or external, not relative to the page.
 */
export function PageDescription({ children }: { children: string }) {
  return (
    <>
      {descriptionParts(children).map((part, index) =>
        part.href === undefined ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <Link
            key={index}
            href={part.href}
            className="text-fd-primary"
          >
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}
