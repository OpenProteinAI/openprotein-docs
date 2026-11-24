'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { ChevronDown, Funnel } from 'lucide-react';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/cn';
import type { ModelFilterSection, ModelSortKey, SortDirection } from '@/lib/model-cards';
import { ChevronDownIcon, SearchIcon, SortDirectionIcon, TimesIcon } from '@/components/models/icons';
import { Tooltip } from '@/components/models/tooltip';

// Ports of the app's SearchBox, SortDropdownBtn, FilterChecklistDropdownBtn and FilterFacetBtns,
// as its Models page wires them: a pill per facet, then Sort and its order.

/** The order button's tooltip; a click flips it. */
const ORDER_TITLES: Record<SortDirection, string> = { asc: 'Ascending', desc: 'Descending' };

/** The gap above a stacked group, in rows — column heights are counted in rows, a title being one. */
const GAP_ROWS = 0.25;
/** Rows a column may hold before the groups spread over another column, unless one group is taller. */
const MAX_COLUMN_ROWS = 20;

/** The app's DropdownBtn props both dropdowns share. */
interface DropdownProps {
  /** `flat` inside the search box, `secondary` a button of its own beside it. */
  appearance?: 'flat' | 'secondary';
  /** Only the icon, under a tooltip: no label and no chevron. */
  iconOnly?: boolean;
  /** Anchor the menu's right edge to the button's, instead of its left edge. */
  alignRight?: boolean;
}

/** `children` are actions inside the box, after its clear button. */
export function SearchBox({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className={cn('om-search', children && 'has--actions')}>
      <SearchIcon className="om-search-icon" size={16} />
      <input
        type="text"
        className="om-search-input"
        placeholder="Search models"
        aria-label="Search models"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <span className="om-search-actions">
        {value ? (
          <Tooltip content="Clear search">
            <button
              type="button"
              className="op-btn op-btn--flat om-action-btn"
              aria-label="Clear search"
              onClick={() => onChange('')}
            >
              <TimesIcon size={14} />
            </button>
          </Tooltip>
        ) : null}
        {children}
      </span>
    </div>
  );
}

/** The app's DropdownBtn: icon, label and chevron, or the icon alone under a tooltip. */
function DropdownTrigger({
  appearance = 'secondary',
  iconOnly,
  tooltip,
  icon,
  label,
  highlighted,
  className,
  ariaLabel,
}: Omit<DropdownProps, 'alignRight'> & {
  tooltip: string;
  icon?: ReactNode;
  label: ReactNode;
  highlighted: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const trigger = (
    <PopoverTrigger asChild>
      <button
        type="button"
        className={cn(
          'op-btn',
          `op-btn--${appearance}`,
          iconOnly ? 'om-action-btn' : 'om-dropdown-btn',
          icon && 'has--icon',
          className,
        )}
        data-highlighted={highlighted || undefined}
        aria-label={ariaLabel}
      >
        {iconOnly ? (
          icon
        ) : (
          <span className="op-btn__content">
            {icon}
            {label}
            <ChevronDownIcon className="om-dropdown-chevron" />
          </span>
        )}
      </button>
    </PopoverTrigger>
  );

  return iconOnly ? <Tooltip content={tooltip}>{trigger}</Tooltip> : trigger;
}

export function SortDropdown({
  appearance = 'secondary',
  alignRight,
  label = 'Sort',
  options,
  value,
  direction,
  defaultValue,
  defaultDirection,
  onChange,
  onDirectionChange,
}: Omit<DropdownProps, 'iconOnly'> & {
  /** Names the sort before the picked option, as `Sort: Relevance`. */
  label?: string;
  options: { value: ModelSortKey; text: string }[];
  value: ModelSortKey;
  direction: SortDirection;
  defaultValue: ModelSortKey;
  defaultDirection: SortDirection;
  onChange: (value: ModelSortKey) => void;
  onDirectionChange: (direction: SortDirection) => void;
}) {
  const selected = options.find((option) => option.value === value)?.text ?? 'Sort by';
  const order = ORDER_TITLES[direction];

  return (
    <div className="om-btn-group is--pill">
      <Popover>
        <DropdownTrigger
          appearance={appearance}
          tooltip={label}
          label={
            <span>
              <span className="om-sort-label">{label}:</span> <span className="om-sort-value">{selected}</span>
            </span>
          }
          highlighted={value !== defaultValue}
        />

        <PopoverContent align={alignRight ? 'end' : 'start'} sideOffset={7} className="om-floating om-dropdown">
          <MenuGroup title="Sort by">
            {options.map((option) => (
              <Radio
                key={option.value}
                name="om-sort"
                label={option.text}
                checked={option.value === value}
                onSelect={() => onChange(option.value)}
              />
            ))}
          </MenuGroup>
        </PopoverContent>
      </Popover>

      <Tooltip content={order}>
        <button
          type="button"
          className={cn('op-btn', `op-btn--${appearance}`, 'om-order-btn')}
          data-highlighted={direction !== defaultDirection || undefined}
          aria-label={order}
          onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
        >
          <SortDirectionIcon direction={direction} />
        </button>
      </Tooltip>
    </div>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="om-menu-list" role="radiogroup" aria-label={title}>
      <div className="om-menu-header">
        <span className="om-menu-title">{title}</span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

/** The row is wider than its label, which picks on its own; the rest of it has to. */
const isRowClick = (event: MouseEvent) => !(event.target as Element).closest('label');

function Radio({ name, label, checked, onSelect }: { name: string; label: ReactNode; checked: boolean; onSelect: () => void }) {
  return (
    <li className="om-menu-item" onClick={(event) => isRowClick(event) && onSelect()}>
      <label className={cn('om-radio', checked && 'is--checked')}>
        <input type="radio" name={name} checked={checked} onChange={onSelect} />
        {label}
      </label>
    </li>
  );
}

export function FilterDropdown({
  appearance,
  iconOnly,
  alignRight,
  buttonText = 'Filter',
  showCount,
  hideSectionTitles,
  hideIcon,
  layout = 'packed',
  fitViewport,
  footerText,
  sections,
  value,
  onChange,
  extraSection,
  extraSectionTitle,
  extraSectionActive,
  extraSectionColumn,
  onClearExtraSection,
  onOpenChange,
}: DropdownProps & {
  buttonText?: string;
  /** Follow the label with how many values are selected, once any are. */
  showCount?: boolean;
  /** Drop each section's title row, for a dropdown of one facet that its button already names. */
  hideSectionTitles?: boolean;
  /** Leave out the filter icon. */
  hideIcon?: boolean;
  /** `sections`: a column per section, each with its own Clear, and no summary row. */
  layout?: 'packed' | 'sections';
  /** `sections`: columns narrowed to the viewport, wrapping past their least width. */
  fitViewport?: boolean;
  /** A footer with Clear all and Done, e.g. `12 models match`. */
  footerText?: string;
  sections: ModelFilterSection[];
  /** Selected values per section key; other keys pass through untouched. */
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
  /** A filter that isn't a checklist, atop the last column. */
  extraSection?: ReactNode;
  extraSectionTitle?: string;
  /** Counts as one selected. */
  extraSectionActive?: boolean;
  /** `sections`: the section whose column `extraSection` tops. */
  extraSectionColumn?: string;
  onClearExtraSection?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  // Every section starts open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sectioned = layout === 'sections';
  const fitted = sectioned && fitViewport;
  const selectedIn = (key: string) => value[key] ?? [];
  const count =
    sections.reduce((total, section) => total + selectedIn(section.key).length, 0) + (extraSectionActive ? 1 : 0);
  const columns = sectioned ? sections.map((section) => [section]) : filterColumns(sections);
  const extraIndex = Math.max(
    0,
    sectioned && extraSectionColumn
      ? columns.findIndex((column) => column.some((section) => section.key === extraSectionColumn))
      : columns.length - 1,
  );

  function toggle(key: string, item: string) {
    const selected = selectedIn(key);
    onChange({
      ...value,
      [key]: selected.includes(item) ? selected.filter((v) => v !== item) : [...selected, item],
    });
  }

  /** Only the sections this dropdown renders; the other buttons' picks stay. */
  function clearAll() {
    onChange({ ...value, ...Object.fromEntries(sections.map((section) => [section.key, []])) });
    onClearExtraSection?.();
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <DropdownTrigger
        appearance={appearance}
        iconOnly={iconOnly}
        tooltip={buttonText}
        icon={hideIcon ? undefined : <Funnel className="om-dropdown-icon" size={14} strokeWidth={2} aria-hidden />}
        label={<FilterLabel text={buttonText} count={showCount ? count : 0} />}
        highlighted={count > 0}
        ariaLabel={iconOnly || count ? `${buttonText}${count ? `, ${count} selected` : ''}` : undefined}
      />

      <PopoverContent
        align={alignRight ? 'end' : 'start'}
        sideOffset={7}
        collisionPadding={8}
        className={cn('om-floating om-dropdown om-filter-dropdown', sectioned && 'is--sections')}
      >
        {/* Packed: always there, so a first pick can't shift the sections. */}
        {sectioned ? null : (
          <div className="om-menu-header">
            <span className={cn('om-menu-title', !count && 'is--empty')}>
              {count ? `${count} selected` : 'No filters selected'}
            </span>
            {count ? (
              <button type="button" className="op-btn op-btn--text om-clear-all" onClick={clearAll}>
                Clear all
              </button>
            ) : null}
          </div>
        )}

        <div
          className={cn('om-filter-columns', fitted && 'is--fitted')}
          style={fitted ? ({ '--om-column-count': columns.length } as CSSProperties) : undefined}
        >
          {columns.map((column, index) => (
            <div key={index} className="om-filter-column">
              {extraSection && index === extraIndex ? (
                <div className={cn('om-filter-section om-filter-extra-section', column.length && 'is--first')}>
                  {extraSectionTitle ? (
                    <div className="om-filter-section-header">
                      <span className="om-menu-title">{extraSectionTitle}</span>
                      {sectioned && extraSectionActive ? (
                        <SectionClear onClick={() => onClearExtraSection?.()} />
                      ) : null}
                    </div>
                  ) : null}
                  {extraSection}
                </div>
              ) : null}

              {column.map((section) => {
                const open = sectioned || hideSectionTitles || !collapsed[section.key];
                const selected = selectedIn(section.key);

                return (
                  <div key={section.key} className="om-filter-section">
                    {hideSectionTitles ? null : sectioned ? (
                      <div className="om-filter-section-header">
                        <span className="om-menu-title">{section.title}</span>
                        {selected.length ? (
                          <SectionClear onClick={() => onChange({ ...value, [section.key]: [] })} />
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="om-filter-section-header"
                        aria-expanded={open}
                        onClick={() => setCollapsed({ ...collapsed, [section.key]: open })}
                      >
                        <ChevronDown className={cn('om-filter-chevron', !open && 'is--closed')} size={14} aria-hidden />
                        <span className="om-menu-title">{section.title}</span>
                        {selected.length ? <span className="om-section-count">{selected.length}</span> : null}
                      </button>
                    )}

                    {open ? (
                      <ul className="om-menu-list">
                        {section.items.map((item) => (
                          <li
                            key={item.value}
                            className={cn('om-menu-item', item.disabled && 'is--disabled')}
                            onClick={(event) => isRowClick(event) && toggle(section.key, item.value)}
                          >
                            <label
                              className={cn(
                                'om-checkbox',
                                selected.includes(item.value) && 'is--checked',
                                item.disabled && 'is--disabled',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(item.value)}
                                disabled={item.disabled}
                                onChange={() => toggle(section.key, item.value)}
                              />
                              {item.text || item.value}
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {footerText ? (
          <div className="om-filter-footer">
            <span className="om-filter-footer-count">{footerText}</span>
            <button type="button" className="op-btn op-btn--flat om-footer-btn om-footer-clear" onClick={clearAll}>
              Clear all
            </button>
            <PopoverClose asChild>
              <button type="button" className="op-btn op-btn--primary om-footer-btn">
                Done
              </button>
            </PopoverClose>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** A button's label, its count after once any are selected. */
function FilterLabel({ text, count }: { text: string; count: number }) {
  return (
    <span>
      {text}
      {count ? (
        <>
          {' '}
          <span className="om-count-badge">{count}</span>
        </>
      ) : null}
    </span>
  );
}

function SectionClear({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="op-btn op-btn--text om-section-clear" onClick={onClick}>
      Clear
    </button>
  );
}

/** The app's FormToggleSwitch, small variant, labelled as on its Models page. */
export function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="om-switch-row">
      <span className={cn('om-switch', checked && 'is--checked')}>
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </span>
      {label}
    </label>
  );
}

/** A ToggleSwitch as a Filters menu row; the whole row flips it. */
export function FilterSwitch(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <ul className="om-menu-list">
      <li className="om-menu-item" onClick={(event) => isRowClick(event) && props.onChange(!props.checked)}>
        <ToggleSwitch {...props} />
      </li>
    </ul>
  );
}

/** A pill per facet; one Filters button holds them all where they don't fit. */
export function FilterFacetButtons({
  sections,
  value,
  onChange,
  extraSectionKey,
  extraSectionTitle,
  extraSection,
  extraActive,
  onClear,
  toggle,
  footerText,
}: {
  sections: ModelFilterSection[];
  value: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
  /** The facet whose dropdown also holds `extraSection`. */
  extraSectionKey?: string;
  extraSectionTitle?: string;
  extraSection?: ReactNode;
  extraActive?: boolean;
  /** Lifts the host's `extraSection` filter. */
  onClear?: () => void;
  /** Stands in for `extraSection` before the pills; it rejoins the Filters menu. */
  toggle?: ReactNode;
  /** The Filters footer, e.g. `12 models match`. */
  footerText?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inFacet = !toggle;
  const countOf = (section: ModelFilterSection) =>
    (value[section.key]?.length ?? 0) + (inFacet && section.key === extraSectionKey && extraActive ? 1 : 0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;

    const fit = () => {
      const full = measure.getBoundingClientRect().width;
      const room = root.getBoundingClientRect().width;
      setOverflows(full > room + 0.5);
      // The tools' width with every pill shown: `.om-tools` wraps by it.
      const tools = root.parentElement;
      if (tools) {
        const rest = tools.getBoundingClientRect().width - room;
        tools.style.setProperty('--om-tools-width', `${Math.ceil(full + rest)}px`);
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    observer.observe(measure);
    fit();

    return () => observer.disconnect();
  }, []);

  // Held while a menu is open, which would lose its button.
  useLayoutEffect(() => {
    if (!menuOpen) setCollapsed(overflows);
  }, [overflows, menuOpen]);

  return (
    <div ref={rootRef} className="om-facet-btns">
      {collapsed ? (
        <FilterDropdown
          alignRight
          buttonText="Filters"
          showCount
          hideIcon
          layout="sections"
          fitViewport
          footerText={footerText}
          sections={sections}
          value={value}
          onChange={onChange}
          extraSection={extraSection}
          extraSectionTitle={extraSectionTitle}
          extraSectionActive={extraActive}
          extraSectionColumn={extraSectionKey}
          onClearExtraSection={onClear}
          onOpenChange={setMenuOpen}
        />
      ) : (
        <>
          {toggle}
          {sections.map((section) => (
            <FilterDropdown
              key={section.key}
              alignRight
              buttonText={section.title}
              showCount
              hideSectionTitles
              hideIcon
              sections={[section]}
              value={value}
              onChange={onChange}
              onOpenChange={setMenuOpen}
              {...(inFacet &&
                section.key === extraSectionKey && {
                  extraSection,
                  extraSectionTitle,
                  extraSectionActive: extraActive,
                  onClearExtraSection: onClear,
                })}
            />
          ))}
        </>
      )}

      {/* Every pill at its width, to tell whether they fit. */}
      <div ref={measureRef} className="om-facet-btns is--measure" aria-hidden inert>
        {toggle}
        {sections.map((section) => (
          <span key={section.key} className="op-btn op-btn--secondary om-dropdown-btn">
            <span className="op-btn__content">
              <FilterLabel text={section.title} count={countOf(section)} />
              <ChevronDownIcon className="om-dropdown-chevron" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The sections in order, over as few columns as keep to MAX_COLUMN_ROWS, then evened out by
 * finding the lowest column height that still fits that many — short groups stack.
 */
function filterColumns(sections: ModelFilterSection[]) {
  const heights = sections.map((section) => section.items.length + 1);
  const tallest = Math.max(0, ...heights);
  let high = Math.max(MAX_COLUMN_ROWS, tallest);
  let low = tallest;
  const count = packColumns(heights, high).length;

  while (high - low > 0.1) {
    const mid = (low + high) / 2;
    if (packColumns(heights, mid).length <= count) high = mid;
    else low = mid;
  }

  return packColumns(heights, high).map((column) => column.map((index) => sections[index]));
}

/** Section indexes per column, a column taking sections until the next would pass `limit` rows. */
function packColumns(heights: number[], limit: number) {
  const columns: number[][] = [];
  let used = Infinity;

  heights.forEach((height, index) => {
    if (used + GAP_ROWS + height > limit) {
      columns.push([]);
      used = -GAP_ROWS;
    }
    columns[columns.length - 1].push(index);
    used += GAP_ROWS + height;
  });

  return columns;
}
