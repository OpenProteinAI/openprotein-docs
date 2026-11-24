'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

type Status = 'idle' | 'copied' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No clipboard API outside a secure context.
    const area = document.createElement('textarea');
    area.value = text;
    area.readOnly = true;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    const done = document.execCommand('copy');
    area.remove();
    return done;
  }
}

/** Right-click on an equation: Copy as TeX. */
export function MathCopyMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; tex: string } | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = (event: MouseEvent) => {
      const math = (event.target as Element | null)?.closest?.('mjx-container[data-tex]');
      if (!math) return;
      event.preventDefault();
      setStatus('idle');
      setMenu({ x: event.clientX, y: event.clientY, tex: math.getAttribute('data-tex') ?? '' });
    };
    document.addEventListener('contextmenu', open);
    return () => document.removeEventListener('contextmenu', open);
  }, []);

  useLayoutEffect(() => {
    const node = panel.current;
    if (!menu || !node) return;
    // Kept on screen.
    node.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - node.offsetWidth - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(menu.y, window.innerHeight - node.offsetHeight - 8))}px`;
    node.querySelector('button')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setMenu(null), status === 'copied' ? 700 : 1600);
    return () => clearTimeout(timer);
  }, [status]);

  if (!menu) return null;
  const Icon = status === 'copied' ? Check : status === 'failed' ? X : Copy;
  return (
    <div
      ref={panel}
      role="menu"
      aria-label="Equation"
      className="fixed z-50 w-max rounded-[0.75em] border border-fd-border bg-fd-popover p-1 text-fd-foreground shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={async () => setStatus((await copyText(menu.tex)) ? 'copied' : 'failed')}
        className="op-menu-item w-full hover:bg-fd-primary/10 focus-visible:bg-fd-primary/10 focus-visible:outline-none"
      >
        <Icon className="text-fd-muted-foreground" />
        <span aria-live="polite">{status === 'copied' ? 'Copied' : status === 'failed' ? "Couldn't copy" : 'Copy as TeX'}</span>
      </button>
    </div>
  );
}
