'use client';

import type { ComponentProps } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

// shadcn/ui's tooltip on Radix, wearing the platform UI's tooltip panel (`.op-tooltip` in
// app/global.css). Pinned to fumadocs' Radix set, so it shares their popper and portal.

/** Instant, as the platform UI's tooltips are; Radix's own default waits 700ms. */
export function TooltipProvider({ delayDuration = 0, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

/** Carries its own provider, as shadcn's does, so a page needs no wrapper to use it. */
export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  );
}

/** Without a provider of its own, for tooltips that share one. */
export const TooltipRoot = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 7,
  collisionPadding = 8,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn('op-tooltip', className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
