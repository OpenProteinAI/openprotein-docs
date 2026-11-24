'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, FolderOpen, HardDrive, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { Button } from '@/components/site/button';
import { readSettings, renameKey, writeSettings } from '@/lib/editor/frontmatter';
import { NOTEBOOKS_URL } from '@/lib/editor/notebook';
import type { LocalNotebook } from './notebook-preview';
import { useDismiss } from './use-dismiss';

const LABEL = 'text-sm font-medium text-fd-foreground';
const HINT = 'text-xs text-fd-muted-foreground';
const FIELD = 'op-field w-full text-sm text-fd-foreground placeholder:text-fd-muted-foreground disabled:opacity-60';

interface Draft {
  id: number;
  key: string;
  value: string;
}

let notebookList: Promise<string[]> | null = null;

/** The site's notebooks, fetched once; a failure is retried next time. */
function fetchNotebookList(): Promise<string[]> {
  notebookList ??= fetch(NOTEBOOKS_URL)
    .then((response) => (response.ok ? (response.json() as Promise<string[]>) : Promise.reject(new Error())))
    .catch(() => {
      notebookList = null;
      return [];
    });
  return notebookList;
}

interface Folder {
  path: string;
  folders: Map<string, Folder>;
  files: string[];
}

/** Notebook paths as a folder tree. */
function toTree(files: string[]): Folder {
  const root: Folder = { path: '', folders: new Map(), files: [] };
  for (const file of files) {
    let folder = root;
    for (const name of file.split('/').slice(0, -1)) {
      let next = folder.folders.get(name);
      if (!next) {
        next = { path: folder.path ? `${folder.path}/${name}` : name, folders: new Map(), files: [] };
        folder.folders.set(name, next);
      }
      folder = next;
    }
    folder.files.push(file);
  }
  return root;
}

const indent = (depth: number) => ({ paddingInlineStart: `calc(0.625rem + ${depth} * 0.875rem)` });

/** A folder's subfolders, then its notebooks, each level indented. */
function NotebookTree({
  folder,
  depth,
  value,
  onPick,
}: {
  folder: Folder;
  depth: number;
  value: string;
  onPick: (file: string) => void;
}) {
  return (
    <>
      {[...folder.folders].map(([name, child]) => (
        <div key={name} role="group" aria-label={child.path}>
          <div className="pe-2.5 pt-2 pb-1 text-xs text-fd-muted-foreground" style={indent(depth)}>
            {name}
          </div>
          <NotebookTree folder={child} depth={depth + 1} value={value} onPick={onPick} />
        </div>
      ))}
      {folder.files.map((file) => (
        <button
          key={file}
          type="button"
          role="menuitem"
          onClick={() => onPick(file)}
          style={indent(depth)}
          className="flex w-full items-center gap-2 rounded-[0.6em] py-1.5 pe-2.5 text-start transition-colors hover:bg-fd-primary/10 focus-visible:bg-fd-primary/10 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1 truncate">{file.slice(file.lastIndexOf('/') + 1).replace(/\.ipynb$/, '')}</span>
          {file === value ? <Check aria-label="Current" className="size-4 shrink-0 text-fd-primary" /> : null}
        </button>
      ))}
    </>
  );
}

/** Arrow keys move between a menu's items. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role=menuitem]'));
  if (!items.length) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const step = event.key === 'ArrowDown' ? 1 : -1;
  const next = at === -1 ? (step === 1 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
  event.preventDefault();
  items[next].focus();
}

/** Path input with a list of the site's notebooks, and a local file to preview instead. */
function NotebookField({
  id,
  value,
  locked,
  onPick,
  localNotebook,
  onLocalNotebook,
}: {
  id: string;
  value: string;
  locked: boolean;
  onPick: (path: string | null) => void;
  localNotebook: LocalNotebook | null;
  onLocalNotebook: (notebook: LocalNotebook | null) => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [list, setList] = useState<string[] | null>(null);
  const [box, setBox] = useState<{ width: number; offset: number }>();
  const group = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    let current = true;
    void fetchNotebookList().then((files) => {
      if (current) setList(files);
    });
    return () => {
      current = false;
    };
  }, [listOpen]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-notebook`} className={LABEL}>
        Notebook
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
        <Popover
          open={listOpen}
          onOpenChange={(next) => {
            // Starts at the field's left edge, at least as wide.
            const width = group.current?.offsetWidth ?? 0;
            if (next) setBox({ width, offset: (toggle.current?.offsetWidth ?? 0) - width });
            setListOpen(next);
          }}
        >
          <div ref={group} className="op-field op-field-group has-[input:disabled]:opacity-60">
            <input
              id={`${id}-notebook`}
              className="text-sm text-fd-foreground placeholder:text-fd-muted-foreground"
              value={value}
              placeholder="tutorials/learn/name.ipynb"
              disabled={locked}
              // An empty path fails the build.
              onChange={(event) => onPick(event.target.value || null)}
            />
            <PopoverTrigger asChild>
              <button ref={toggle} type="button" aria-label="Choose a notebook" disabled={locked}>
                <ChevronDown className="size-4" />
              </button>
            </PopoverTrigger>
          </div>
          <PopoverContent
            align="start"
            alignOffset={box?.offset}
            sideOffset={4}
            style={{ minWidth: box?.width }}
            className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-max max-w-[min(32rem,calc(100vw-1rem))] rounded-[0.75em] bg-fd-popover p-1 backdrop-blur-none"
            // Keeps the panel open.
            onEscapeKeyDown={(event) => event.stopPropagation()}
          >
            <div role="menu" aria-label="Notebooks" onKeyDown={moveFocus}>
              {list === null ? (
                <p className="px-2.5 py-2 text-fd-muted-foreground">Loading…</p>
              ) : list.length === 0 ? (
                <p className="px-2.5 py-2 text-fd-muted-foreground">No notebooks found.</p>
              ) : (
                <NotebookTree
                  folder={toTree(list)}
                  depth={0}
                  value={value}
                  onPick={(file) => {
                    onPick(file);
                    setListOpen(false);
                  }}
                />
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="secondary" size="compact" onClick={() => picker.current?.click()} className="min-h-8">
          <FolderOpen className="size-4" />
          Open file
        </Button>
        <input
          ref={picker}
          type="file"
          accept=".ipynb"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onLocalNotebook({ name: file.name, text: await file.text() });
          }}
        />
      </div>
      {localNotebook ? (
        <div className="flex items-center gap-2 text-sm">
          <HardDrive aria-hidden className="size-4 shrink-0 text-fd-muted-foreground" />
          <span className="min-w-0 truncate">{localNotebook.name}</span>
          <Button
            variant="flat"
            size="compact"
            aria-label={`Close ${localNotebook.name}`}
            onClick={() => onLocalNotebook(null)}
            className="ms-auto px-2"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Key input that renames on blur, so typing never collides mid-word. */
function KeyInput({ value, onRename, label }: { value: string; onRename: (to: string) => boolean; label: string }) {
  const [draft, setDraft] = useState(value);
  const [taken, setTaken] = useState(false);
  const commit = () => {
    const to = draft.trim();
    if (to === value) return;
    const ok = Boolean(to) && onRename(to);
    setTaken(!ok);
    if (!ok) setDraft(value);
  };
  return (
    <input
      aria-label={label}
      aria-invalid={taken || undefined}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
      className={`${FIELD} font-mono`}
    />
  );
}

export function PageSettings({
  source,
  onChange,
  localNotebook,
  onLocalNotebook,
}: {
  source: string;
  onChange: (next: string) => void;
  localNotebook: LocalNotebook | null;
  onLocalNotebook: (notebook: LocalNotebook | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  const id = useId();
  const settings = useMemo(() => readSettings(source), [source]);
  const locked = Boolean(settings.error);
  const set = (changes: Record<string, string | boolean | null>) => onChange(writeSettings(source, changes));

  const addDraft = (draft: Draft, key: string) => {
    if (!key.trim() || settings.attributes.some((attribute) => attribute.key === key.trim())) return false;
    set({ [key.trim()]: draft.value });
    setDrafts((list) => list.filter((item) => item.id !== draft.id));
    return true;
  };

  return (
    <div ref={root} className="relative">
      <Button
        variant="flat"
        size="compact"
        selected={open}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-[2.125rem]"
      >
        <SlidersHorizontal className="size-4" />
        Page settings
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby={`${id}-title`}
          className="absolute top-[calc(100%+0.375rem)] left-0 z-50 flex max-h-[calc(100dvh-8.75rem)] w-[27.5rem] max-w-[calc(100vw-1.5rem)] flex-col gap-4 overflow-y-auto rounded-[0.75em] border border-fd-border bg-fd-popover p-4 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span id={`${id}-title`} className="font-medium">
              Page settings
            </span>
            <code className="rounded-md bg-fd-muted px-1.5 py-0.5 text-xs text-fd-muted-foreground">frontmatter</code>
            <Button variant="flat" size="compact" aria-label="Close page settings" onClick={close} className="ms-auto px-2">
              <X className="size-4" />
            </Button>
          </div>

          {locked ? (
            <p className="text-sm" style={{ color: 'var(--color-fd-error)' }}>
              The frontmatter has a YAML error. Fix it in the source to edit it here: {settings.error}
            </p>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Title</span>
            <input
              className={FIELD}
              value={settings.title}
              disabled={locked}
              onChange={(event) => set({ title: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Sidebar title</span>
            <input
              className={FIELD}
              value={settings.sidebarTitle}
              placeholder={settings.title}
              disabled={locked}
              // An empty one would blank the sidebar entry.
              onChange={(event) => set({ sidebarTitle: event.target.value || null })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className={LABEL}>Description</span>
              <span className={HINT}>{settings.description.length} characters</span>
            </span>
            <textarea
              rows={3}
              className={`${FIELD} resize-y leading-normal`}
              value={settings.description}
              disabled={locked}
              onChange={(event) => set({ description: event.target.value })}
            />
          </label>
          <NotebookField
            id={id}
            value={settings.notebook}
            locked={locked}
            onPick={(path) => set({ notebook: path })}
            localNotebook={localNotebook}
            onLocalNotebook={onLocalNotebook}
          />
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Duo content</span>
            <span className="flex min-h-8 items-center gap-2 text-sm">
              <input
                type="checkbox"
                role="switch"
                checked={settings.duoContent}
                disabled={locked}
                onChange={(event) => set({ duoContent: event.target.checked })}
                className="size-4 accent-[var(--color-fd-primary)]"
              />
              Enable duo content for App and Python notebook
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={LABEL}>Custom attributes</span>
              <Button
                variant="text"
                disabled={locked}
                onClick={() => setDrafts((list) => [...list, { id: Date.now(), key: '', value: '' }])}
              >
                <Plus className="size-3.5" />
                Add attribute
              </Button>
            </div>
            {settings.attributes.map((attribute) => (
              <div key={attribute.key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-1.5">
                <KeyInput
                  value={attribute.key}
                  label="Attribute name"
                  onRename={(to) => {
                    const next = renameKey(source, attribute.key, to);
                    if (next) onChange(next);
                    return Boolean(next);
                  }}
                />
                <input
                  aria-label={`Value for ${attribute.key}`}
                  className={FIELD}
                  value={attribute.value}
                  disabled={locked || attribute.readOnly}
                  title={attribute.readOnly ? 'Lists and maps are edited in the source.' : undefined}
                  onChange={(event) => set({ [attribute.key]: event.target.value })}
                />
                <Button
                  variant="flat"
                  size="compact"
                  aria-label={`Remove ${attribute.key}`}
                  disabled={locked}
                  onClick={() => set({ [attribute.key]: null })}
                  className="px-2"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-1.5"
                // Commits when focus leaves the row.
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) addDraft(draft, draft.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addDraft(draft, draft.key);
                }}
              >
                <input
                  aria-label="New attribute name"
                  placeholder="key"
                  autoFocus
                  className={`${FIELD} font-mono`}
                  value={draft.key}
                  onChange={(event) =>
                    setDrafts((list) => list.map((item) => (item.id === draft.id ? { ...item, key: event.target.value } : item)))
                  }
                />
                <input
                  aria-label="New attribute value"
                  placeholder="value"
                  className={FIELD}
                  value={draft.value}
                  onChange={(event) =>
                    setDrafts((list) => list.map((item) => (item.id === draft.id ? { ...item, value: event.target.value } : item)))
                  }
                />
                <Button
                  variant="flat"
                  size="compact"
                  aria-label="Discard new attribute"
                  onClick={() => setDrafts((list) => list.filter((item) => item.id !== draft.id))}
                  className="px-2"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
