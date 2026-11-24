import { extendTailwindMerge } from 'tailwind-merge';

// Tailwind orders its stylesheet by scale, not by class-attribute order, so a caller's px-2
// never beats a component's px-4 on order alone — the loser has to leave the list.
/** Joins Tailwind classes so the last one wins on conflicts. */
export const cn = extendTailwindMerge({
  // The theme's own steps (TYPOGRAPHY.md), so they replace their defaults.
  extend: { theme: { leading: ['prose'], tracking: ['caps'] } },
});
