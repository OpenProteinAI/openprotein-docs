'use client';

import type { ComponentProps } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/cn';

// shadcn/ui's progress on Radix, wearing the platform UI's ProgressBar (`.op-progress-bar` in
// app/global.css). Pinned to fumadocs' Radix set, as the tooltip is.

/** Leave `value` unset for the intermediate sweep, as the platform UI calls it. */
export function Progress({ className, value = null, max = 100, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root value={value} max={max} className={cn('op-progress-bar', className)} {...props}>
      <ProgressPrimitive.Indicator
        className="op-progress-bar__value"
        style={value == null ? undefined : { width: `${(value / max) * 100}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
