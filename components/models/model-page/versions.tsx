'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { versionDescription, type BaseModelView } from '@/lib/base-models';
import type { ModelCard } from '@/lib/model-cards';
import { versionPageUrl } from '@/lib/models-tree';
import { ModelVersionIcon } from '@/components/models/icons';
import { Badges, InfoRows, MethodChips, ToolLinks } from '@/components/models/model-card';

// Ports of the app's ModelFinderDetail, as its Models menu shows a base model: the version cards,
// then the picked version's details.

/** Links to each version's page; every card as wide as the widest. */
export function VersionCards({ view, selected }: { view: BaseModelView; selected: string }) {
  const versions = view.versions;
  const listRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    // One synchronous pass, so it never paints.
    const measure = () => {
      list.classList.add('is--measuring');
      const widths = [...list.children].map((card) => card.getBoundingClientRect().width);
      list.classList.remove('is--measuring');
      setWidth(Math.ceil(Math.max(0, ...widths)));
    };
    measure();
    // Again with the web font.
    document.fonts.ready.then(measure);
  }, [versions]);

  return (
    <nav
      ref={listRef}
      className="om-version-cards"
      aria-label="Model versions"
      style={width ? ({ '--om-version-width': `${width}px` } as CSSProperties) : undefined}
    >
      {versions.map((version) => (
        <Link
          key={version.id}
          href={versionPageUrl(view, version.id)}
          // Keep the scroll.
          scroll={false}
          className={cn('om-version-card', version.id === selected && 'is--selected')}
          aria-current={version.id === selected ? 'page' : undefined}
          data-model-id={version.id}
        >
          <ModelVersionIcon size={18} />
          <span className="om-version-name" title={version.version}>
            {version.version}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** Main column (description, details), then output and tools beside it, or under it. */
export function VersionDetail({ card }: { card: ModelCard }) {
  const description = versionDescription(card);

  return (
    <div className="om-version-detail">
      {/* No name: the title, or the picked card, already says it. */}
      {card.recommended || card.popular || card.highlight || card.isNew ? (
        <div className="om-detail-head">
          <Badges card={card} />
        </div>
      ) : null}

      <div className="om-detail-cols">
        <div className="om-detail-main">
          {description ? <div className="om-detail-description">{description}</div> : null}

          <div>
            <div className="om-card-label om-detail-label">Details</div>
            <InfoRows rows={card.info} inputTypes={card.inputTypes} wrap />
          </div>
        </div>

        {card.methodChips.length ? (
          <div className="om-detail-methods">
            <div className="om-card-label om-detail-label">Outputs</div>
            <MethodChips chips={card.methodChips} />
          </div>
        ) : null}

        {card.tools.length ? (
          <div className="om-detail-tools">
            <div className="om-card-label om-detail-label">Tools</div>
            <ToolLinks tools={card.tools} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
