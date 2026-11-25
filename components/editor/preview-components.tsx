'use client';

import type { ComponentProps, ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from '@/components/mdx/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Callout } from '@/components/mdx/callout';
import { PlatformDiagram } from '@/components/mdx/platform-diagram';
import { Publication, Publications } from '@/components/mdx/publication';
import {
  TutorialColumn,
  TutorialGroup,
  TutorialLinks,
  TutorialTopic,
} from '@/components/mdx/tutorial-topic';
import { withBase } from '@/lib/base-path';

type Align = 'left' | 'center' | 'right';

const BOX: Record<Align, string> = { left: 'me-auto', center: 'mx-auto', right: 'ms-auto' };

function src(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') ? withBase(value) : String(value ?? '');
}

function length(width: number | string) {
  return typeof width === 'number' || /^\d+$/.test(width) ? `${width}px` : width;
}

/** Figure without the server's file read for intrinsic size. */
function Figure({
  src: path,
  alt = '',
  caption,
  width,
  align = 'center',
}: {
  src: string;
  alt?: string;
  caption?: ReactNode;
  width?: number | string;
  align?: Align;
}) {
  return (
    <figure
      className={`not-prose my-6 ${BOX[align] ?? BOX.center}`}
      style={width ? { maxWidth: length(width) } : undefined}
    >
      <ImageZoom src={src(path)}>
        <img src={src(path)} alt={alt} className="h-auto w-full rounded-lg" />
      </ImageZoom>
      {caption ? (
        <figcaption
          className={`mt-2 leading-relaxed text-fd-muted-foreground [&_a]:text-fd-primary ${align === 'center' ? 'text-center' : ''}`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Screencast without the server's WebP lookup. */
function Screencast({ src: path, alt = '', width, height, caption }: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
}) {
  return (
    <figure className="my-6">
      <img
        src={src(path)}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full max-w-full rounded-lg"
      />
      {caption ? <figcaption className="mt-2 text-center text-fd-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}

function Img(props: ComponentProps<'img'>) {
  return <img {...props} src={src(props.src)} alt={props.alt ?? ''} className="rounded-lg" />;
}

/** New tab, so a click never leaves the editor. */
function Link({ href = '', ...props }: ComponentProps<'a'>) {
  if (href.startsWith('#')) return <a href={href} {...props} />;
  return <a href={src(href)} target="_blank" rel="noopener noreferrer" {...props} />;
}

export function Missing({ name, reason }: { name: string; reason: string }) {
  return (
    <span className="not-prose my-2 block rounded-lg border border-dashed border-fd-border px-3 py-2 font-mono text-sm text-fd-muted-foreground">
      {`<${name}>`} {reason}
    </span>
  );
}

function publishedOnly(name: string) {
  return function PublishedOnly() {
    return <Missing name={name} reason="renders on the published page only." />;
  };
}

const SERVER_ONLY = ['Bibliography', 'Cite', 'SectionCards', 'TipRow', 'PyClass', 'PyFunction', 'PyGroup', 'PySummary'];

export const PREVIEW_COMPONENTS: MDXComponents = {
  ...defaultComponents,
  a: Link,
  img: Img,
  Accordion,
  Accordions,
  Callout,
  Figure,
  PlatformDiagram,
  Publication,
  Publications,
  Screencast,
  Step,
  Steps,
  Tab,
  Tabs,
  TutorialColumn,
  TutorialGroup,
  TutorialLinks,
  TutorialTopic,
  TypeTable,
  ...Object.fromEntries(SERVER_ONLY.map((name) => [name, publishedOnly(name)])),
};
