'use client';

import { useEffect, type RefObject } from 'react';

/** Closes a popover on an outside press or Escape, as SessionMenu does. */
export function useDismiss(root: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      // Portalled popovers count as inside.
      if (root.current?.contains(target) || target.closest?.('[data-radix-popper-content-wrapper]')) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [root, open, close]);
}
