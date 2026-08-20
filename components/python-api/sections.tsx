import { renderDocstring } from '@/lib/python-doc';
import type { PySection, PySectionItem } from '@/lib/python-api';
import { TypeRef } from './type-ref';

const TITLE: Record<string, string> = {
  parameters: 'Parameters',
  'other parameters': 'Other parameters',
  returns: 'Returns',
  raises: 'Raises',
  attributes: 'Attributes',
  examples: 'Examples',
};

/** Docstring prose, rendered through the notebook markdown pipeline after RST normalising. */
export async function Prose({
  text,
  shift = 5,
  className = 'prose-no-margin text-sm',
}: {
  text: string | null | undefined;
  shift?: number;
  className?: string;
}) {
  if (!text?.trim()) return null;
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: await renderDocstring(text, shift) }} />
  );
}

function Row({ item, html }: { item: PySectionItem; html?: string }) {
  return (
    <div className="border-t border-fd-border/70 py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {item.name ? (
          <code className="not-prose font-mono text-sm font-medium text-fd-foreground">
            {item.name}
          </code>
        ) : null}
        {item.type_parts?.length || item.type ? (
          <TypeRef
            parts={item.type_parts}
            fallback={item.type}
            className="not-prose font-mono text-xs break-all text-[color:var(--py-type)]"
          />
        ) : null}
        {item.default ? (
          <span className="not-prose font-mono text-xs text-fd-muted-foreground">
            = {item.default}
          </span>
        ) : null}
      </div>
      {/* Markdown, not plain text: the generator rewrites RST roles into links, so a
          parameter description routinely contains `[Protein](/python-api/…)`. Rendering it
          as text printed the link syntax verbatim. */}
      {html ? (
        <div
          className="prose-no-margin mt-0.5 text-sm text-fd-muted-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose mb-1 text-xs font-semibold tracking-[0.06em] uppercase text-fd-muted-foreground">
      {children}
    </div>
  );
}

/**
 * The eight docstring section kinds this SDK uses, out of griffe's eighteen. Prose is
 * resolved before rendering rather than returning an array of promises from `.map()` —
 * clearer, and it keeps the whole block a single await.
 */
export async function Sections({ sections, skip = [] }: { sections?: PySection[]; skip?: string[] }) {
  if (!sections?.length) return null;
  const shown = sections.filter((section) => !skip.includes(section.kind));
  if (!shown.length) return null;

  const rendered = await Promise.all(
    shown.map(async (section) => {
      if (section.kind === 'text') return { section, html: await renderDocstring(section.text, 5) };
      if (section.kind === 'examples') {
        return {
          section,
          examples: await Promise.all(section.items.map((item) => renderDocstring(item, 5))),
        };
      }
      if (section.kind === 'admonition') {
        return { section, html: await renderDocstring(section.text, 5) };
      }
      return {
        section,
        rows: await Promise.all(
          section.items.map((item) => (item.text ? renderDocstring(item.text, 5) : undefined)),
        ),
      };
    }),
  );

  return (
    <>
      {rendered.map((entry, index) => {
        const { section } = entry;

        if (section.kind === 'text') {
          return (
            <div
              key={index}
              className="prose-no-margin text-sm"
              dangerouslySetInnerHTML={{ __html: entry.html! }}
            />
          );
        }

        if (section.kind === 'admonition') {
          return (
            <div
              key={index}
              className="not-prose my-3 rounded-[0.75em] border border-[color-mix(in_oklab,var(--color-fd-info)_28%,transparent)] bg-[color-mix(in_oklab,var(--color-fd-info)_6%,transparent)] px-3 py-2"
            >
              {section.title ? (
                <div className="mb-0.5 text-xs font-semibold tracking-[0.04em] uppercase text-fd-muted-foreground">
                  {section.title}
                </div>
              ) : null}
              <div
                className="prose-no-margin text-sm text-fd-foreground"
                dangerouslySetInnerHTML={{ __html: entry.html! }}
              />
            </div>
          );
        }

        if (section.kind === 'examples') {
          return (
            <div key={index} className="my-3">
              <Title>{TITLE.examples}</Title>
              {entry.examples!.map((html, i) => (
                <div key={i} className="prose-no-margin text-sm" dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </div>
          );
        }

        return (
          <div key={index} className="my-3">
            <Title>{TITLE[section.kind] ?? section.kind}</Title>
            <div className="flex flex-col">
              {section.items.map((item, i) => (
                <Row key={i} item={item} html={entry.rows?.[i]} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
