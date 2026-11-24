'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider, type TOCProviderProps } from 'fumadocs-ui/layouts/notebook/page/slots/toc';
import { ToggleButtons } from '@/components/site/toggle-buttons';
import { useHashTarget } from '@/components/use-hash-target';
import { CLIENT_KEY, CLIENT_PARAM, parseClient, type TutorialClient } from '@/lib/tutorial-client';

export type ClientTOCItem = TOCItemType & { client?: TutorialClient };

const listeners = new Set<() => void>();
/** A link into the other version switched it; scroll to the fragment once it renders. */
let seekHash = false;

function read(): TutorialClient {
  const param = parseClient(new URLSearchParams(window.location.search).get(CLIENT_PARAM));
  if (param) return param;
  try {
    return parseClient(localStorage.getItem(CLIENT_KEY)) ?? 'app';
  } catch {
    return 'app';
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

/** `remember`: the reader's own pick, kept for the next tutorial. */
function choose(client: TutorialClient, remember: boolean) {
  if (remember) {
    try {
      localStorage.setItem(CLIENT_KEY, client);
    } catch {}
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get(CLIENT_PARAM) !== client) {
    url.searchParams.set(CLIENT_PARAM, client);
    window.history.replaceState(null, '', url.href);
  }
  for (const listener of listeners) listener();
}

/** null until hydrated: both versions render and CSS shows the pre-paint script's pick. */
function useTutorialClient(): TutorialClient | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** A link into one version's own heading opens that version. */
function follow(client: TutorialClient) {
  if (read() === client) return;
  seekHash = true;
  choose(client, false);
}

function scrollToHash() {
  let id: string;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  if (id) document.getElementById(id)?.scrollIntoView();
}

const CLIENTS: { value: TutorialClient; text: string }[] = [
  { value: 'app', text: 'App' },
  { value: 'python', text: 'Python' },
];

export function TutorialClientToggle() {
  const client = useTutorialClient();
  return (
    <ToggleButtons
      label="Tutorial version"
      value={client}
      options={CLIENTS}
      onChange={(value) => choose(value, true)}
      className="op-client-toggle"
      data-client={client ?? undefined}
    />
  );
}

/** Mounts one version at a time: the two share heading ids. */
export function TutorialClientPanes({
  app,
  python,
  ids,
}: {
  app: ReactNode;
  python: ReactNode;
  /** Each version's heading ids, so a link to the other's opens it. */
  ids: Record<TutorialClient, string[]>;
}) {
  const client = useTutorialClient();
  const prev = useRef<TutorialClient | null>(null);

  const onlyApp = ids.app.filter((id) => !ids.python.includes(id));
  const onlyPython = ids.python.filter((id) => !ids.app.includes(id));
  useHashTarget(onlyApp, () => follow('app'));
  useHashTarget(onlyPython, () => follow('python'));

  useEffect(() => {
    const was = prev.current;
    prev.current = client;
    if (client === null) return;
    // While both rendered, the browser scrolled to the hidden App copy of a shared id.
    if (seekHash || (was === null && client === 'python')) scrollToHash();
    seekHash = false;
  }, [client]);

  return (
    <div className="op-client-panes" data-pending={client === null || undefined}>
      {client !== 'python' ? <div data-client-pane="app">{app}</div> : null}
      {client !== 'app' ? <div data-client-pane="python">{python}</div> : null}
    </div>
  );
}

/** The TOC lists the shown version's headings only. */
export function TutorialClientTOCProvider({ toc, ...props }: TOCProviderProps) {
  const client = useTutorialClient() ?? 'app';
  const items = useMemo(
    () =>
      (toc as ClientTOCItem[])
        .filter((item) => !item.client || item.client === client)
        .map(({ client: _, ...item }) => item),
    [toc, client],
  );
  return <TOCProvider {...props} toc={items} />;
}
