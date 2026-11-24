'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/site/button';
import { cn } from '@/lib/cn';

const ORDER = ['system', 'light', 'dark'] as const;
const LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' } as const;
const ICON = { system: SunMoon, light: Sun, dark: Moon };

/** Cycles auto -> light -> dark; fumadocs' themeSwitch is a three-segment pill. */
const noop = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The stored theme is only readable in the browser, so the server and the first client render
  // both show Auto; the real icon follows once hydrated.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const current = hydrated && (ORDER as readonly string[]).includes(theme ?? '')
    ? (theme as (typeof ORDER)[number])
    : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];
  // The icon carries the current theme, so both tooltip and accessible name name the next one.
  const label = `Switch to ${LABEL[next]}`;

  return (
    <Button
      variant="secondary"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
      className={cn('size-8 px-0', className)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
