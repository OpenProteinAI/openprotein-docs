'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSidebar } from 'fumadocs-ui/layouts/notebook/slots/sidebar';
import {
  baseModelCards,
  matchesModelFilters,
  matchesModelSearch,
  MODEL_FILTER_FAMILY,
  MODEL_FILTER_INPUT_TYPE,
  MODEL_FILTER_METHOD_OUTPUT,
  MODEL_FILTER_QUERY_KEYS,
  MODEL_SORT_OPTIONS,
  modelFilterSections,
  sortModelCards,
  type ModelCard as Card,
  type ModelSortKey,
  type SortDirection,
} from '@/lib/model-cards';
import {
  FilterFacetButtons,
  FilterSwitch,
  SearchBox,
  SortDropdown,
  ToggleSwitch,
} from '@/components/models/catalog-controls';
import { ModelCard } from '@/components/models/model-card';
import { useHashTarget } from '@/components/use-hash-target';

const QUERY_SORT = 'sort';
const QUERY_ORDER = 'order';
const QUERY_VERSIONS = 'versions';
const DEFAULT_SORT: ModelSortKey = 'relevant';
const DEFAULT_ORDER: SortDirection = 'asc';
const DEFAULT_VERSIONS = 'all';
/** Base only: a switch in the toolbar, the Show section of the Filters menu. */
const BASE_VERSIONS = 'base';
/** How long a card the reader was sent to stays marked. */
const TARGET_FLASH_MS = 2000;

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

interface Props {
  title: string;
  description: string;
  /** Page-level buttons, opposite the title. */
  actions?: ReactNode;
  /** Null when the platform couldn't be reached. */
  cards: Card[] | null;
  /** Per model id, its version's page. */
  pages: Record<string, string>;
}

/** The sort and filters a URL names; anything it leaves out is at its default. */
function urlState(search: string) {
  const params = new URLSearchParams(search);
  const sort = params.get(QUERY_SORT) as ModelSortKey;
  const versions = params.get(QUERY_VERSIONS) ?? '';
  const filters: Record<string, string[]> = {};

  Object.entries(MODEL_FILTER_QUERY_KEYS).forEach(([key, queryKey]) => {
    const values = params.getAll(queryKey).filter(Boolean);
    if (values.length) filters[key] = values;
  });

  return {
    sortKey: MODEL_SORT_OPTIONS.some((option) => option.value === sort) ? sort : DEFAULT_SORT,
    sortDirection: (params.get(QUERY_ORDER) === 'desc' ? 'desc' : DEFAULT_ORDER) as SortDirection,
    versions: versions === BASE_VERSIONS ? BASE_VERSIONS : DEFAULT_VERSIONS,
    filters,
  };
}

export function ModelCatalog({ title, description, actions, cards, pages }: Props) {
  const all = useMemo(() => cards ?? [], [cards]);
  const { setOpen: setSidebarOpen } = useSidebar();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<ModelSortKey>(DEFAULT_SORT);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_ORDER);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [versions, setVersions] = useState(DEFAULT_VERSIONS);
  const baseOnly = versions === BASE_VERSIONS;
  const setBaseOnly = (on: boolean) => setVersions(on ? BASE_VERSIONS : DEFAULT_VERSIONS);
  /** The URL is read once on mount; until then it isn't written over. */
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<{ id: string; at: number } | null>(null);

  /** What Show leaves: the search, the filters and their options work on it. */
  const listed = useMemo(() => (versions === DEFAULT_VERSIONS ? all : baseModelCards(all)), [all, versions]);
  const searched = useMemo(
    () => (query ? listed.filter((card) => matchesModelSearch(card, query)) : listed),
    [listed, query],
  );
  /** Facets come from the whole listing; an option the search and other filters rule out is disabled. */
  const sections = useMemo(() => modelFilterSections(listed, filters, searched), [listed, filters, searched]);
  const displayed = useMemo(
    () => sortModelCards(searched.filter((card) => matchesModelFilters(card, filters)), sortKey, sortDirection),
    [searched, filters, sortKey, sortDirection],
  );

  const countText = !all.length
    ? ''
    : displayed.length === all.length
      ? NUMBER_FORMAT.format(all.length)
      : `${NUMBER_FORMAT.format(displayed.length)} of ${NUMBER_FORMAT.format(all.length)}`;

  /** The URL's sort and filters, replacing the page's; a search would only narrow them further. */
  const applyUrl = useCallback((search: string) => {
    const state = urlState(search);
    setSortKey(state.sortKey);
    setSortDirection(state.sortDirection);
    setVersions(state.versions);
    setFilters(state.filters);
    setQuery('');
  }, []);

  // Seeded from the URL, so a shared link opens on the same sort and filters; back and forward
  // step through the links followed in place below.
  useEffect(() => {
    applyUrl(window.location.search);
    setReady(true);

    const onPopState = () => applyUrl(window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyUrl]);

  // A value still at its default is left out of the URL entirely.
  useEffect(() => {
    if (!ready) return;

    const params = new URLSearchParams();
    if (sortKey !== DEFAULT_SORT) params.set(QUERY_SORT, sortKey);
    if (sortDirection !== DEFAULT_ORDER) params.set(QUERY_ORDER, sortDirection);
    if (versions !== DEFAULT_VERSIONS) params.set(QUERY_VERSIONS, versions);
    Object.entries(MODEL_FILTER_QUERY_KEYS).forEach(([key, queryKey]) => {
      (filters[key] ?? []).forEach((value) => params.append(queryKey, value));
    });

    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [ready, sortKey, sortDirection, versions, filters]);

  /** A card the search or filters hide is brought back before the page scrolls to it. */
  const focusCard = useCallback(
    (id: string) => {
      if (!all.some((card) => card.id === id)) return;
      if (!displayed.some((card) => card.id === id)) {
        setQuery('');
        setFilters({});
        setVersions(DEFAULT_VERSIONS);
      }
      setTarget({ id, at: Date.now() });
    },
    [all, displayed],
  );

  const ids = useMemo(() => all.map((card) => card.id), [all]);
  useHashTarget(ids, focusCard);

  // Links back into this page — the sidebar's families, a card's #anchor — are Next <Link>s, which
  // only swap the URL here. A prevented click is one <Link> leaves alone, so the page applies it.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return;

      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      if (!url.search && !url.hash && !window.location.search) return;

      let id = '';
      try {
        id = decodeURIComponent(url.hash.slice(1));
      } catch {
        return;
      }
      if (id && !all.some((card) => card.id === id)) return;

      event.preventDefault();
      setSidebarOpen(false);
      if (url.href !== window.location.href) window.history.pushState(null, '', url.href);

      if (id) {
        focusCard(id);
        return;
      }
      applyUrl(url.search);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [all, applyUrl, focusCard, setSidebarOpen]);

  useEffect(() => {
    if (!target) return;

    const scroll = window.requestAnimationFrame(() => {
      document.getElementById(target.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    const clear = window.setTimeout(() => setTarget(null), TARGET_FLASH_MS);

    return () => {
      window.cancelAnimationFrame(scroll);
      window.clearTimeout(clear);
    };
  }, [target]);

  /** A card chip toggles its own value, so a second click on it lifts the filter again. */
  function toggleFilter(sectionKey: string, value: string) {
    const active = filters[sectionKey] ?? [];
    setFilters({
      ...filters,
      [sectionKey]: active.includes(value) ? active.filter((item) => item !== value) : [...active, value],
    });
  }

  /** A newly picked order starts in its natural direction. */
  function changeSort(key: ModelSortKey) {
    setSortKey(key);
    setSortDirection('asc');
  }

  return (
    <div className="op-models">
      <div className="om-header">
        <div className="om-title-row">
          <h1 className="om-title">
            {title}
            {countText ? <span className="om-count">{countText}</span> : null}
          </h1>
          {actions}
        </div>

        <p className="om-lead">{description}</p>

        {/* As the app's Models page: the box, then the facets as a group and Sort, at the right. */}
        {cards ? (
          <div className="om-toolbar">
            <SearchBox value={query} onChange={setQuery} />

            <div className="om-tools">
              <FilterFacetButtons
                sections={sections}
                value={filters}
                onChange={setFilters}
                extraSectionKey={MODEL_FILTER_FAMILY}
                extraSectionTitle="Show"
                extraSection={<FilterSwitch label="Base only" checked={baseOnly} onChange={setBaseOnly} />}
                extraActive={versions !== DEFAULT_VERSIONS}
                onClear={() => setVersions(DEFAULT_VERSIONS)}
                toggle={<ToggleSwitch label="Base only" checked={baseOnly} onChange={setBaseOnly} />}
                footerText={`${NUMBER_FORMAT.format(displayed.length)} ${displayed.length === 1 ? 'model matches' : 'models match'}`}
              />
              <SortDropdown
                alignRight
                options={MODEL_SORT_OPTIONS}
                value={sortKey}
                direction={sortDirection}
                defaultValue={DEFAULT_SORT}
                defaultDirection={DEFAULT_ORDER}
                onChange={changeSort}
                onDirectionChange={setSortDirection}
              />
            </div>
          </div>
        ) : null}
      </div>

      {!cards ? (
        <div className="om-message">
          The model catalogue couldn&apos;t be loaded from the platform. Try again in a few minutes.
        </div>
      ) : displayed.length ? (
        <div className="om-grid">
          {displayed.map((card) => (
            <ModelCard
              key={card.id}
              card={card}
              query={query}
              activeMethods={filters[MODEL_FILTER_METHOD_OUTPUT] ?? []}
              activeInputTypes={filters[MODEL_FILTER_INPUT_TYPE] ?? []}
              onSelectMethod={(value) => toggleFilter(MODEL_FILTER_METHOD_OUTPUT, value)}
              onSelectInputType={(value) => toggleFilter(MODEL_FILTER_INPUT_TYPE, value)}
              targeted={target?.id === card.id}
              href={pages[card.id]}
            />
          ))}
        </div>
      ) : (
        <div className="om-message">No models found</div>
      )}
    </div>
  );
}
