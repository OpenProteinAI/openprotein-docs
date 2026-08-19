import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SECTIONS } from '@/lib/sections';

/** `slots.header` is passed per layout — it isn't on BaseLayoutProps. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'OpenProtein.AI Guide', url: '/' },
    links: SECTIONS.map((section) => ({
      type: 'main' as const,
      text: section.text,
      url: section.url,
      active: 'nested-url' as const,
    })),
  };
}
