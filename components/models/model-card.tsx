'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Book } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  inputTypeLabel,
  linkLabel,
  METHOD_OUTPUT_COLORS,
  methodOutputLabel,
  type ModelCard as Card,
  type ModelInfoRow,
  type ModelMethodChip,
  type ModelToolLink,
} from '@/lib/model-cards';
import { Highlight } from '@/components/models/highlight';
import { ArrowRightIcon, GithubIcon, ToolIcon } from '@/components/models/icons';
import { Tooltip, TooltipGroup } from '@/components/models/tooltip';

// A port of the app's ModelCard, `expanded` as its Models page renders it: the details sit in
// the card and only its Tools wait for hover.

interface Props {
  card: Card;
  /** Active search query — its matches are marked in every field the card renders. */
  query?: string;
  activeMethods?: string[];
  activeInputTypes?: string[];
  /** Without these the chips are labels, not filters. */
  onSelectMethod?: (output: string) => void;
  onSelectInputType?: (type: string) => void;
  /** Flashed when the sidebar or a link sends the reader to this card. */
  targeted?: boolean;
  /** Where the card leads — its name links there, and so does a click on the card. */
  href?: string;
}

export function ModelCard({
  card,
  query = '',
  activeMethods = [],
  activeInputTypes = [],
  onSelectMethod,
  onSelectInputType,
  targeted,
  href,
}: Props) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [toolsHeight, setToolsHeight] = useState(0);
  const [descriptionExtra, setDescriptionExtra] = useState(0);
  const [unfolded, setUnfolded] = useState(false);
  const [toolsUp, setToolsUp] = useState(false);
  const hasTools = card.tools.length > 0;

  /** The tools grow up only where they'd run past the bottom of the view yet fit above. */
  function onCardEntered(event: MouseEvent<HTMLDivElement>) {
    const description = descriptionRef.current;
    // The lines past the clamp's three, which unfold with the tools.
    const line = description ? parseFloat(getComputedStyle(description).lineHeight) : 0;
    const extra = description ? Math.max(0, Math.ceil(description.scrollHeight - 3 * line)) : 0;
    const height = (toolsRef.current?.offsetHeight ?? 0) + extra;

    const rect = event.currentTarget.getBoundingClientRect();
    // The sticky header covers the top of the view.
    const top = document.getElementById('nd-subnav')?.getBoundingClientRect().bottom ?? 0;

    setDescriptionExtra(extra);
    setToolsHeight(height);
    setToolsUp(rect.bottom + height > window.innerHeight && rect.top - height >= top);
  }

  // Unclamped while the reveal is out: from when it starts growing until it has closed.
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const onReveal = (event: TransitionEvent) => {
      if (event.target !== node || event.propertyName !== '--om-tools-reveal') return;
      const hovered = node.matches(":hover, :has(.om-method-chip[data-state$='open'])");
      if (event.type === 'transitionstart' && hovered) setUnfolded(true);
      if (event.type !== 'transitionstart' && !hovered) setUnfolded(false);
    };
    const types = ['transitionstart', 'transitionend', 'transitioncancel'] as const;
    for (const type of types) node.addEventListener(type, onReveal);
    return () => {
      for (const type of types) node.removeEventListener(type, onReveal);
    };
  }, []);

  /** The rest of the card follows its name; its own links and chips keep their clicks. */
  function onCardClicked(event: MouseEvent<HTMLDivElement>) {
    if (!href || (event.target as Element).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }

  return (
    <div
      id={card.id}
      className={cn(
        'om-card',
        (hasTools || descriptionExtra > 0) && 'has--hover-tools',
        unfolded && 'is--unfolded',
        toolsUp && 'is--tools-up',
        targeted && 'is--targeted',
        href && 'is--link',
      )}
      // Growing to a measured height, not a cap, lets the reveal ease to a stop instead of halting.
      style={
        toolsHeight
          ? ({
              '--om-tools-height': `${toolsHeight}px`,
              '--om-description-extra': `${descriptionExtra}px`,
            } as CSSProperties)
          : undefined
      }
      ref={cardRef}
      onMouseEnter={onCardEntered}
      onClick={onCardClicked}
    >
      <div className="om-card-head">
        {href ? (
          <Link href={href} className="om-card-name" title={card.name}>
            <Highlight text={card.name} query={query} />
          </Link>
        ) : (
          <div className="om-card-name" title={card.name}>
            <Highlight text={card.name} query={query} />
          </div>
        )}

        <Badges card={card} />

        <ModelLinks card={card} />
      </div>

      {card.description ? (
        <div className="om-card-description-section">
          <div ref={descriptionRef} className="om-card-description">
            <Highlight text={card.description} query={query} />
          </div>
        </div>
      ) : null}

      <CardIo
        card={card}
        query={query}
        activeMethods={activeMethods}
        activeInputTypes={activeInputTypes}
        onSelectMethod={onSelectMethod}
        onSelectInputType={onSelectInputType}
      />

      <div className="om-card-details">
        <div className="om-card-divider" />

        <InfoRows rows={card.info} query={query} twoColumns />

        <div className="om-card-tools">
          {hasTools ? (
            <div ref={toolsRef}>
              <ToolsPanel className="om-tools-panel" tools={card.tools} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Badges({ card }: { card: Card }): ReactNode {
  return (
    <>
      {card.recommended ? (
        <span className="om-badge">Recommended</span>
      ) : card.popular ? (
        <span className="om-badge om-badge--popular">Popular</span>
      ) : null}
      {card.highlight ? <span className="om-badge om-badge--highlight">Highlight</span> : null}
      {card.isNew ? <span className="om-badge om-badge--new">New</span> : null}
    </>
  );
}

function ToolsPanel({ className, tools }: { className?: string; tools: ModelToolLink[] }) {
  return (
    <div className={className}>
      <div className="om-card-label">Tools</div>
      <ToolLinks tools={tools} />
    </div>
  );
}

/** A model's paper and code: icon buttons on a card, labelled ones in a page's title row. */
export function ModelLinks({ card, labelled }: { card: Card; labelled?: boolean }) {
  if (!card.doiUrl && !card.githubUrl) return null;
  const className = labelled ? 'op-btn op-btn--secondary om-link-btn' : 'op-btn op-btn--flat om-icon-btn';

  return (
    <div className={cn('om-model-links', labelled && 'is--labelled')}>
      {card.doiUrl ? (
        <Tooltip
          content={
            <div className="om-link-tip">
              <div className="om-link-tip-url">{linkLabel(card.doiUrl)}</div>
              {card.citation ? <div className="om-link-tip-citation">{card.citation}</div> : null}
            </div>
          }
        >
          <a
            className={className}
            href={card.doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Paper: ${linkLabel(card.doiUrl)}`}
          >
            <Book size={14} strokeWidth={2} aria-hidden />
            {labelled ? 'Paper' : null}
          </a>
        </Tooltip>
      ) : null}

      {card.githubUrl ? (
        <Tooltip content={linkLabel(card.githubUrl)}>
          <a
            className={className}
            href={card.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`GitHub: ${linkLabel(card.githubUrl)}`}
          >
            <GithubIcon size={14} />
            {labelled ? 'GitHub' : null}
          </a>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** Output, then input beside it, or under it once it does not fit. */
export function CardIo({
  card,
  query = '',
  activeMethods = [],
  activeInputTypes = [],
  onSelectMethod,
  onSelectInputType,
}: {
  card: Card;
  query?: string;
  activeMethods?: string[];
  activeInputTypes?: string[];
  onSelectMethod?: (output: string) => void;
  onSelectInputType?: (type: string) => void;
}) {
  return (
    <div className="om-card-io">
      <div className="om-card-methods">
        <div className="om-card-label">Outputs</div>
        <MethodChips chips={card.methodChips} query={query} active={activeMethods} onSelect={onSelectMethod} />
      </div>

      <div className="om-card-input-types">
        <div className="om-card-label">Inputs</div>
        <InputTypeChips types={card.inputTypes} query={query} active={activeInputTypes} onSelect={onSelectInputType} />
      </div>
    </div>
  );
}

export function MethodChips({
  chips,
  query = '',
  active = [],
  onSelect,
}: {
  chips: ModelMethodChip[];
  query?: string;
  active?: string[];
  onSelect?: (output: string) => void;
}) {
  return (
    <div className="om-card-chips">
      <TooltipGroup>
        {chips.map((chip) => (
          <Tooltip key={chip.output} interactive content={<MethodTip chip={chip} />}>
            <Chip
              className={cn('om-method-chip', METHOD_OUTPUT_COLORS[chip.output])}
              text={methodOutputLabel(chip.output)}
              query={query}
              selected={active.includes(chip.output)}
              onSelect={onSelect && (() => onSelect(chip.output))}
            />
          </Tooltip>
        ))}
      </TooltipGroup>
    </div>
  );
}

function InputTypeChips({
  types,
  query = '',
  active = [],
  onSelect,
}: {
  types: string[];
  query?: string;
  active?: string[];
  onSelect?: (type: string) => void;
}) {
  return (
    <div className="om-card-chips">
      {types.map((type) => (
        <Chip
          key={type}
          text={inputTypeLabel(type)}
          query={query}
          selected={active.includes(type)}
          onSelect={onSelect && (() => onSelect(type))}
        />
      ))}
    </div>
  );
}

/** A filter where `onSelect` is given, else a label; `props` are a tooltip trigger's. */
function Chip({
  className,
  text,
  query,
  selected,
  onSelect,
  ...props
}: {
  className?: string;
  text: string;
  query: string;
  selected: boolean;
  onSelect?: () => void;
}) {
  return onSelect ? (
    <button
      {...props}
      type="button"
      className={cn('om-chip is--selectable', className, selected && 'is--selected')}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <Highlight text={text} query={query} />
    </button>
  ) : (
    <span {...props} className={cn('om-chip', className)}>
      <Highlight text={text} query={query} />
    </span>
  );
}

function MethodTip({ chip }: { chip: ModelMethodChip }) {
  return (
    <div className="om-method-tip">
      <div className="om-method-tip-title">{methodOutputLabel(chip.output)}</div>

      {chip.methods.map((method) => (
        <div key={method.path}>
          {method.descriptionHtml ? (
            <div className="om-method-tip-desc" dangerouslySetInnerHTML={{ __html: method.descriptionHtml }} />
          ) : method.description ? (
            <div className="om-method-tip-desc">{method.description}</div>
          ) : null}

          <div className="om-method-tip-io">
            <div className="om-card-label">Input</div>
            <div>
              <span className="om-code">{method.input}</span>
            </div>

            <div className="om-card-label">Outputs</div>
            <div className="om-method-tip-outputs">
              {method.outputs.map((output) => (
                <span key={output} className="contents">
                  <span className="om-code">{output}</span>
                  <span className="om-method-tip-default">{output === method.default_output ? 'default' : ''}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Info list roots, mapped to their own-line setters. */
const infoLists = new Map<Element, (labels: string[]) => void>();

/** One observer for every card's list. */
let infoListObserver: ResizeObserver | null = null;

/** Moves rows with a cut value to their own line, re-pairing the rest. */
function measureInfoLists(roots: Element[]) {
  const lists = roots.flatMap((root) => {
    const fit = infoLists.get(root);
    if (!fit) return [];
    const items = [...root.querySelectorAll<HTMLElement>(':scope > .om-info-item')];
    const shown = items.map((item) => item.classList.contains('is--own-line'));
    return [{ fit, items, shown, own: new Set<number>() }];
  });

  lists.forEach(({ items }) => items.forEach((item) => item.classList.remove('is--own-line')));

  // All reads, then all writes: one layout a pass.
  let pending = lists;
  while (pending.length) {
    const cuts = pending.map(({ items }) => cutItemIndexes(items));
    pending = pending.filter(({ items, own }, n) => {
      cuts[n].forEach((i) => {
        own.add(i);
        items[i].classList.add('is--own-line');
      });
      return cuts[n].length > 0;
    });
  }

  lists.forEach(({ items, shown }) => items.forEach((item, i) => item.classList.toggle('is--own-line', shown[i])));
  lists.forEach(({ fit, items, own }) =>
    fit(items.filter((_, i) => own.has(i)).map((item) => item.dataset.label ?? '')),
  );
}

function cutItemIndexes(items: HTMLElement[]) {
  return items.flatMap((item, i) => {
    const value = item.lastElementChild;
    const paired = !item.matches('.is--wide, .is--own-line');
    return paired && value && value.scrollWidth > value.clientWidth ? [i] : [];
  });
}

/** `wrap`: pairs flow inline, Input leading; `twoColumns`: two rows a line, a cut one alone. */
export function InfoRows({
  rows,
  query = '',
  inputTypes,
  wrap,
  twoColumns,
}: {
  rows: ModelInfoRow[];
  query?: string;
  inputTypes?: string[];
  wrap?: boolean;
  twoColumns?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ownLines, setOwnLines] = useState<string[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !twoColumns) return;

    infoLists.set(root, (labels) => setOwnLines((shown) => (shown.join('\n') === labels.join('\n') ? shown : labels)));
    if (!infoListObserver) {
      infoListObserver = new ResizeObserver((entries) => measureInfoLists(entries.map((entry) => entry.target)));
      // Again with the web font.
      document.fonts.ready.then(() => measureInfoLists([...infoLists.keys()]));
    }
    infoListObserver.observe(root);

    return () => {
      infoListObserver?.unobserve(root);
      infoLists.delete(root);
    };
  }, [rows, twoColumns]);

  return (
    <div ref={rootRef} className={cn('om-info-rows', wrap && 'is--wrap', twoColumns && 'is--two-columns')}>
      {inputTypes ? (
        <div className="om-info-item is--wide">
          <div className="om-info-label">Inputs</div>
          <InputTypeChips types={inputTypes} query={query} />
        </div>
      ) : null}

      {rows.map((row) => (
        <div
          key={row.label}
          className={cn('om-info-item', twoColumns && ownLines.includes(row.label) && 'is--own-line')}
          data-label={row.label}
        >
          <div className="om-info-label">
            <Highlight text={row.label} query={query} />
          </div>
          <div className="om-info-value">
            <Highlight text={row.value} query={query} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A tool list's parent, mapped to the list and how to tell it what fits. */
const toolLists = new Map<Element, { list: HTMLElement; fit: (twoColumns: boolean) => void }>();

/** One observer for every card, so a resize lays the page out twice for all the lists, not twice for each. */
let toolListObserver: ResizeObserver | null = null;

/** Two columns where the widest link, hover arrow and all, fits in half the width, else one. */
function measureToolLists(entries: ResizeObserverEntry[]) {
  const measured = entries.flatMap((entry) => {
    const item = toolLists.get(entry.target);
    if (!item) return [];
    const links = [...item.list.querySelectorAll<HTMLElement>('.om-tool-link')];
    // The list sizes to its content, so it is the parent's content box that is available.
    const gap = parseFloat(getComputedStyle(item.list).columnGap) || 0;
    return [{ ...item, links, gap, available: entry.contentRect.width }];
  });

  // Natural widths, read in one synchronous pass so the change never paints.
  measured.forEach(({ links }) => links.forEach((link) => (link.style.width = 'max-content')));
  const widest = measured.map(({ links }) => Math.max(0, ...links.map((link) => link.offsetWidth)));
  measured.forEach(({ links }) => links.forEach((link) => (link.style.width = '')));

  measured.forEach(({ fit, gap, available }, i) => fit(2 * widest[i] + gap <= available));
}

export function ToolLinks({ tools }: { tools: ModelToolLink[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [twoColumns, setTwoColumns] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const parent = list?.parentElement;
    if (!list || !parent) return;

    toolLists.set(parent, { list, fit: setTwoColumns });
    toolListObserver ??= new ResizeObserver(measureToolLists);
    toolListObserver.observe(parent);

    return () => {
      toolListObserver?.unobserve(parent);
      toolLists.delete(parent);
    };
  }, [tools]);

  return (
    <ul ref={listRef} className={cn('om-tool-links', twoColumns && 'is--two-columns')}>
      {tools.map((tool) => (
        <li key={tool.key}>
          <a className="om-tool-link" href={tool.href} target="_blank" rel="noopener noreferrer">
            <ToolIcon className="om-tool-icon" tool={tool.key} size={16} />
            <span className="om-tool-title">{tool.text}</span>
            <ArrowRightIcon className="om-tool-arrow" size={10} />
          </a>
        </li>
      ))}
    </ul>
  );
}
