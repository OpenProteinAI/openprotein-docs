import Image from 'next/image';
import { Children, isValidElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A topic row: illustration beside one to three titled columns of links. Column titles are
 *  plain text, not headings — the originals had no ids and nothing linked to them. */
export function TutorialTopic({
  image,
  alt = '',
  children,
}: {
  image: string;
  alt?: string;
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-6 flex flex-col gap-5 sm:flex-row sm:items-start">
      <Image
        src={image}
        alt={alt}
        width={220}
        height={220}
        className="w-full shrink-0 rounded-[0.75em] object-contain sm:w-[11.25rem]"
      />
      <div className="grid min-w-0 flex-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** One column of links inside a `<TutorialTopic>`, titled or not. Children are an ordinary markdown
 *  list, or `<TutorialColumn>`s, which sit side by side under the title. */
export function TutorialLinks({ title, children }: { title?: string; children: ReactNode }) {
  const split = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === TutorialColumn,
  );
  return (
    <div className="@container/links min-w-0">
      {title && (
        <p data-tutorial-title className="mb-1 font-semibold text-fd-foreground">
          {title}
        </p>
      )}
      <div
        className={cn(
          '[&_a]:text-fd-primary [&_li]:my-1 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:ps-5 [&_ul_ul]:list-[circle]',
          split &&
            'gap-x-8 @sm/links:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid [&>*:last-child]:mb-0 [&_[data-tutorial-title]]:font-normal',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A row of the tutorials grid: a `##` or `###` heading and summary, then `<TutorialLinks>` blocks.
 *  From 42rem the heading sits beside two columns, or one wider one; the summary's -mt undoes the
 *  column gap. With the heading left outside, the links take the whole row instead. */
export function TutorialGroup({ children }: { children: ReactNode }) {
  const elements = Children.toArray(children).filter(isValidElement);
  const columns = elements.filter(
    (child) => child.type === TutorialLinks || child.type === TutorialColumn,
  ).length;
  // No heading or summary, so no narrow first column to hold them.
  const bare = elements.length === columns;
  return (
    <div
      data-tutorial-group
      className="not-prose @container py-6 [[data-tutorial-group]+&]:border-t [[data-tutorial-group]+&]:border-fd-border"
    >
      <div
        className={cn(
          'grid items-start gap-x-8 gap-y-5',
          bare && columns > 1 && '@md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]',
          !bare && [
            '@md:grid-cols-2 @2xl:grid-rows-[auto_1fr]',
            columns === 1
              ? '@2xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]'
              : '@2xl:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,1fr)]',
            '[&>:is(h2,h3)]:text-lg [&>:is(h2,h3)]:font-medium [&>:is(h2,h3)]:text-fd-foreground [&>p]:-mt-3.5 [&>p]:text-fd-muted-foreground @md:[&>:is(h2,h3)]:col-span-2 @md:[&>p]:col-span-2 @2xl:[&>:is(h2,h3)]:col-span-1 @2xl:[&>:is(h2,h3)]:row-start-1 @2xl:[&>p]:col-span-1 @2xl:[&>p]:row-start-2 @2xl:[&>:not(h2,h3,p)]:row-span-2 @2xl:[&>:not(h2,h3,p)]:row-start-1',
          ],
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Stacks several `<TutorialLinks>` in one column of a `<TutorialGroup>`. */
export function TutorialColumn({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-5">{children}</div>;
}
