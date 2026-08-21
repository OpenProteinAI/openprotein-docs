import Image from 'next/image';
import type { ReactNode } from 'react';

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
      <Image src={icon} alt="" width={60} height={60} className="size-15 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-fd-foreground">{question}</p>
        <div className="mt-1 leading-relaxed text-fd-muted-foreground [&_a]:text-fd-primary [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </div>
    </div>
  );
}
