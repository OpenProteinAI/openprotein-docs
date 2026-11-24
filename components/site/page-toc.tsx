'use client';

import type { ComponentProps } from 'react';
import { useTOCItems } from 'fumadocs-ui/components/toc';
import { TOC } from 'fumadocs-ui/layouts/notebook/page/slots/toc';

// Mirrors fumadocs' own TOC container; #nd-toc in global.css owns the padding-top.
const COLUMN =
  'sticky top-(--fd-docs-row-3) [grid-area:toc] h-[calc(var(--fd-docs-height)-var(--fd-docs-row-3))] flex flex-col w-(--fd-toc-width) pe-4 pb-2 xl:layout:[--fd-toc-width:16.75rem] max-xl:hidden';

/** No headings: drop fumadocs' "No Headings" box, keep the page actions. */
export function PageToc({ footer, ...props }: ComponentProps<typeof TOC>) {
  if (useTOCItems().length === 0) {
    return (
      <div id="nd-toc" className={COLUMN}>
        {footer}
      </div>
    );
  }

  // The rule divides the actions from the list, so the list's side owns it.
  return <TOC {...props} footer={<div className="border-t border-fd-border pt-2">{footer}</div>} />;
}
