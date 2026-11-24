'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  Tooltip as OwnRoot,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Grouped = createContext(false);

/** One provider for neighbouring tooltips, so crossing one on the way into another doesn't open it. */
export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <Grouped.Provider value>{children}</Grouped.Provider>
    </TooltipProvider>
  );
}

/**
 * `content` on hover or keyboard focus of `children`, opening below it from its start edge — where
 * the app's opens below-right of the pointer. `om-floating` carries the page's tokens into the portal.
 * It closes as the pointer leaves the trigger and takes no pointer events, unless `interactive`:
 * then the pointer can cross into it to select text or follow a link.
 */
export function Tooltip({
  content,
  interactive = false,
  children,
}: {
  content: ReactNode;
  interactive?: boolean;
  children: ReactElement;
}) {
  const Root = useContext(Grouped) ? TooltipRoot : OwnRoot;
  if (!content) return children;

  return (
    <Root disableHoverableContent={!interactive}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className={cn('om-floating om-tooltip', interactive && 'is--interactive')}
        // React bubbles clicks out of the portal, to the card that would navigate.
        onClick={interactive ? (event) => event.stopPropagation() : undefined}
      >
        {content}
      </TooltipContent>
    </Root>
  );
}
