'use client';

import { useRef, useState, type RefObject } from 'react';

const MIN_PANE = 320;
const KEY = 'op-editor-split';

/** The editor's share of the width, as this browser last left it. */
export function readSplit(): number {
  try {
    const value = Number(localStorage.getItem(KEY));
    return value > 0 && value < 1 ? value : 0.5;
  } catch {
    return 0.5;
  }
}

function saveSplit(value: number) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // Blocked storage: the split lasts this visit only.
  }
}

/** Drag, arrow keys, or double-click to reset. */
export function Splitter({
  container,
  value,
  onChange,
  controls,
}: {
  container: RefObject<HTMLElement | null>;
  value: number;
  onChange: (value: number) => void;
  controls: string;
}) {
  const [dragging, setDragging] = useState(false);
  const latest = useRef(value);
  latest.current = value;

  const clamp = (ratio: number) => {
    const width = container.current?.clientWidth ?? 0;
    const min = width ? Math.min(0.5, MIN_PANE / width) : 0.2;
    return Math.min(1 - min, Math.max(min, ratio));
  };
  const commit = (ratio: number) => {
    const next = clamp(ratio);
    onChange(next);
    saveSplit(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize editor and preview"
      aria-controls={controls}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      data-dragging={dragging}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const box = container.current?.getBoundingClientRect();
        if (!dragging || !box) return;
        onChange(clamp((event.clientX - box.left) / box.width));
      }}
      onPointerUp={(event) => {
        if (!dragging) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
        saveSplit(latest.current);
      }}
      onDoubleClick={() => commit(0.5)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.02;
        const next =
          event.key === 'ArrowLeft' ? value - step
          : event.key === 'ArrowRight' ? value + step
          : event.key === 'Home' ? 0
          : event.key === 'End' ? 1
          : null;
        if (next === null) return;
        event.preventDefault();
        commit(next);
      }}
      className="group relative z-10 w-px shrink-0 cursor-col-resize touch-none bg-fd-border focus-visible:outline-none"
    >
      {/* Wider than the line, so it is easy to grab. */}
      <span aria-hidden className="absolute inset-y-0 -inset-x-1" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[0.1875rem] -translate-x-1/2 bg-fd-primary opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-100 group-data-[dragging=true]:opacity-100"
      />
    </div>
  );
}
