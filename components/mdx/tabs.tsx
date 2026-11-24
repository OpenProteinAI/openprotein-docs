'use client';

import type { SyntheticEvent } from 'react';
import { usePathname } from 'next/navigation';
import { Tabs as BaseTabs, type TabsProps } from 'fumadocs-ui/components/tabs';

export { Tab } from 'fumadocs-ui/components/tabs';

/** The nearest box that scrolls, e.g. the editor preview, else the page. */
function scrollerOf(el: Element): Element {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Keeps the clicked tab still while the tabs above it resize. */
function pin(event: SyntheticEvent) {
  const tab = (event.target as Element).closest('[role="tab"]');
  const list = tab?.closest('[role="tablist"]');
  if (!tab || !list) return;
  const scroller = scrollerOf(list);
  const top = tab.getBoundingClientRect().top;
  requestAnimationFrame(() => scroller.scrollBy(0, tab.getBoundingClientRect().top - top));
}

/** Every Tabs on a page switches together; ones without the picked item stay put. */
export function Tabs(props: TabsProps) {
  const pathname = usePathname();
  return (
    <BaseTabs
      groupId={`tabs:${pathname}`}
      onMouseDownCapture={pin}
      onKeyDownCapture={pin}
      {...props}
    />
  );
}
