import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/** `slots.header` is passed per layout — it isn't on BaseLayoutProps. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'OpenProtein.AI Guide', url: '/' },
  };
}
