'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { Monitor, Moon, Sun } from 'lucide-react';

const ORDER = ['system', 'light', 'dark'] as const;
const LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' } as const;
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** Cycles auto -> light -> dark; fumadocs' themeSwitch is a three-segment pill. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const current = (ORDER as readonly string[]).includes(theme ?? '')
    ? (theme as (typeof ORDER)[number])
    : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABEL[current]} — switch to ${LABEL[next]}`}
      title={`Theme: ${LABEL[current]} — click for ${LABEL[next]}`}
      onClick={() => setTheme(next)}
      className={[
        'flex size-[34px] shrink-0 items-center justify-center rounded-[0.75em] border border-fd-border bg-fd-background text-fd-muted-foreground transition-colors hover:text-fd-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="size-[15px]" />
    </button>
  );
}
