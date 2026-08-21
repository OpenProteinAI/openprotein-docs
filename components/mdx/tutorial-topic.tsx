import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * One topic row on the "Explore our platform capabilities" page: an illustration beside one to
 * three titled columns of links.
 *
 * The old page built these from a Bootstrap `container > row > col-3/col-9` grid inside
 * `.. raw:: html`, which MDX cannot parse as markup and which depended on the 296 KB Bootstrap
 * bundle the migration drops. The `<h4 class="tutorial-h4">` column headings were decorative —
 * they carried no ids and nothing linked to them — so they are plain text here rather than real
 * headings, which also keeps them out of the page TOC.
 */
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
        className="w-full shrink-0 rounded-[0.75em] object-contain sm:w-[180px]"
      />
      <div className="grid min-w-0 flex-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** One titled column of links inside a `<TutorialTopic>`. Children are an ordinary markdown list. */
export function TutorialLinks({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-semibold text-fd-foreground">{title}</p>
      <div className="[&_a]:text-fd-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:my-1 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:ps-5">
        {children}
      </div>
    </div>
  );
}
