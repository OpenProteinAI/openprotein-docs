const KIND_LABEL: Record<string, string> = {
  class: 'class',
  function: 'def',
  method: 'method',
  property: 'property',
  attribute: 'attribute',
};

/** The `class` / `property` prefix Sphinx renders in front of a signature. */
export function KindLabel({ kind }: { kind: string }) {
  const label = KIND_LABEL[kind] ?? kind;
  return (
    <span
      className="not-prose shrink-0 rounded-md px-1.5 py-px text-xs font-medium tracking-[0.03em] uppercase"
      style={{ color: `var(--py-${kind})`, background: `color-mix(in oklab, var(--py-${kind}) 12%, transparent)` }}
    >
      {label}
    </span>
  );
}

/**
 * A dotted path split so the qualifier stays legible but does not shout: Sphinx renders
 * `openprotein.fold.` in a lighter weight and only the final name in bold.
 */
export function DottedName({ path }: { path: string }) {
  const cut = path.lastIndexOf('.');
  const prefix = cut === -1 ? '' : path.slice(0, cut + 1);
  const name = cut === -1 ? path : path.slice(cut + 1);
  return (
    <span className="font-mono">
      {prefix ? <span className="font-normal text-fd-muted-foreground">{prefix}</span> : null}
      <span className="font-semibold text-fd-foreground">{name}</span>
    </span>
  );
}

/** Call signature or type annotation, in the same monospace as the name it follows. */
export function Signature({ text, kind }: { text?: string | null; kind?: string }) {
  if (!text) return null;
  const prefix = kind === 'attribute' || kind === 'property' ? ': ' : '';
  return (
    <span className="font-mono text-sm break-all text-fd-muted-foreground">
      {prefix}
      {text}
    </span>
  );
}
