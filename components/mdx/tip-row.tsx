import { readFileSync } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import type { ReactNode } from 'react';

/** SVGs are inlined so their `currentColor` follows the theme; an <img> cannot inherit it. */
function Icon({ src }: { src: string }) {
  if (!src.endsWith('.svg')) {
    return (
      <Image src={src} alt="" width={60} height={60} className="size-15 shrink-0 object-contain" />
    );
  }

  const svg = readFileSync(path.join(process.cwd(), 'public', src), 'utf8');
  return (
    <span
      aria-hidden
      className="size-15 shrink-0 text-fd-foreground [&>svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** The "Do you want to..." rows from the old getting-started pages. */
export function TipRow({
  icon,
  question,
  children,
}: {
  icon: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <div className="not-prose flex items-start gap-4 border-b border-fd-border py-4 last:border-b-0">
      <Icon src={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-fd-foreground">{question}</p>
        <div className="mt-1 leading-relaxed text-fd-muted-foreground [&_a]:text-fd-primary">
          {children}
        </div>
      </div>
    </div>
  );
}
