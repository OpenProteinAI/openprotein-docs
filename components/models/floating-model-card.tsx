'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { ModelCard as Card } from '@/lib/model-cards';
import { Badges, CardIo, InfoRows, ModelLinks, ToolLinks } from '@/components/models/model-card';

// The app's ModelCard as its home page renders it: compact, floating open over the grid on hover.

/** The app's ExpandableHoverCard delay. */
const HOVER_DELAY_MS = 300;

/** The CSS collapse. */
const COLLAPSE_MS = 200;

/** Its content's height; the box is the row's. */
function contentHeight(card: HTMLElement) {
  const box = getComputedStyle(card);
  const chrome =
    parseFloat(box.paddingTop) +
    parseFloat(box.paddingBottom) +
    parseFloat(box.borderTopWidth) +
    parseFloat(box.borderBottomWidth);

  return [...card.children].reduce((sum, child) => {
    const style = getComputedStyle(child);
    return sum + (child as HTMLElement).offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  }, chrome);
}

export function FloatingModelCard({ card, href }: { card: Card; href: string }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  /** Open or still closing, so taller than its slot. */
  const open = useRef(false);

  /** Out of flow from the first hover on; the slot keeps its height. */
  const [measured, setMeasured] = useState(false);
  const [slotHeight, setSlotHeight] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [expandUp, setExpandUp] = useState(false);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const [descriptionHeight, setDescriptionHeight] = useState(0);

  useEffect(() => {
    const el = cardRef.current;
    if (!measured || !el) return;

    const observer = new ResizeObserver(() => {
      if (!open.current) setSlotHeight(contentHeight(el));
    });
    observer.observe(el);
    [...el.children].forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [measured]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onEntered(event: MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el || !window.matchMedia('(hover: hover)').matches) return;
    window.clearTimeout(timer.current);

    if (!measured) {
      setSlotHeight(contentHeight(el));
      setMeasured(true);
    }

    const description = descriptionRef.current;
    const details = detailsRef.current?.scrollHeight ?? 0;
    const growth = details + (description ? description.scrollHeight - description.clientHeight : 0);
    setDetailsHeight(details);
    setDescriptionHeight(description?.scrollHeight ?? 0);

    // Up only if it runs past the view's bottom and fits under the header.
    const slot = event.currentTarget.getBoundingClientRect();
    const top = document.getElementById('nd-subnav')?.getBoundingClientRect().bottom ?? 0;
    setExpandUp(slot.bottom + growth > window.innerHeight && slot.top - growth >= top);

    timer.current = window.setTimeout(() => {
      open.current = true;
      setHovered(true);
    }, HOVER_DELAY_MS);
  }

  function onLeft() {
    window.clearTimeout(timer.current);
    setHovered(false);
    if (!open.current) return;

    timer.current = window.setTimeout(() => {
      open.current = false;
      if (cardRef.current) setSlotHeight(contentHeight(cardRef.current));
    }, COLLAPSE_MS);
  }

  /** Its links and buttons keep their clicks. */
  function onCardClicked(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as Element).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }

  return (
    <div
      className="om-float-slot"
      style={measured && slotHeight ? { minHeight: slotHeight } : undefined}
      onMouseEnter={onEntered}
      onMouseLeave={onLeft}
    >
      <div
        ref={cardRef}
        className={cn(
          'om-card is--float is--link',
          measured && 'is--measured',
          hovered && 'is--hovered',
          expandUp && 'is--expand-up',
        )}
        style={
          {
            '--om-details-height': detailsHeight ? `${detailsHeight}px` : undefined,
            '--om-description-height': descriptionHeight ? `${descriptionHeight}px` : undefined,
          } as CSSProperties
        }
        onClick={onCardClicked}
      >
        <div className="om-card-head">
          <Link href={href} className="om-card-name" title={card.name}>
            {card.name}
          </Link>
          <Badges card={card} />
          <ModelLinks card={card} />
        </div>

        {card.description ? (
          <div className="om-card-description-section">
            <div ref={descriptionRef} className="om-card-description">
              {card.description}
            </div>
          </div>
        ) : null}

        <CardIo card={card} />

        <div ref={detailsRef} className="om-card-details">
          <div className="om-card-divider" />

          <InfoRows rows={card.info} twoColumns />

          {card.tools.length ? (
            <div className="om-float-tools">
              <div className="om-card-label">Tools</div>
              <ToolLinks tools={card.tools} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
