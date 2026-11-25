"use client";

import { Maximize2, X } from "lucide-react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/site/button";

/** The board inline, plus a full-screen view that only mounts while open. */
export function PlatformDiagramZoom({
  label,
  zoom = true,
  children,
}: {
  label: string;
  zoom?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fits, setFits] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);

  // Where the board scrolls sideways, a click there is a scroll, not a request to zoom.
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const check = () => setFits(zoom && el.scrollWidth <= el.clientWidth + 1);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    check();
    return () => observer.disconnect();
  }, [zoom]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [open]);

  const show = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (zoom && el.scrollWidth <= el.clientWidth + 1) setOpen(true);
  };

  return (
    <div className="pd-zoom">
      <div
        ref={scroll}
        className={`pd-scroll ${fits ? "pd-zoomable" : ""}`}
        tabIndex={0}
        role="region"
        aria-label={label}
        onClick={show}
      >
        {children}
      </div>
      {fits ? (
        <Button
          variant="secondary"
          size="compact"
          className="pd-expand"
          aria-label="View the diagram full screen"
          title="View full screen"
          onClick={() => setOpen(true)}
        >
          <Maximize2 aria-hidden className="size-3.5" />
        </Button>
      ) : null}

      <dialog
        ref={dialog}
        className="pd-modal"
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={() => dialog.current?.close()}
      >
        {open ? (
          <>
            <div className="pd pd-zoomed">{children}</div>
            <Button
              variant="secondary"
              size="lg"
              className="pd-close size-11 justify-center p-0"
              aria-label="Close full screen view"
              title="Close"
              onClick={() => dialog.current?.close()}
            >
              <X aria-hidden className="size-5" />
            </Button>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
