'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** One choice of several, as a segmented control. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; Icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-0.5 rounded-[0.75em] bg-fd-secondary p-[0.1875rem]', className)}>
      {options.map(({ value: option, label: text, Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className="inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-[0.6em] px-2.5 text-sm font-medium text-fd-foreground/80 transition-colors hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none aria-pressed:bg-fd-popover aria-pressed:text-fd-foreground aria-pressed:shadow-sm"
        >
          {Icon ? <Icon className="size-4" /> : null}
          {text}
        </button>
      ))}
    </div>
  );
}
