import type { CSSProperties, ReactNode } from 'react';
import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react';

type Type = 'info' | 'tip' | 'warn' | 'warning' | 'error' | 'success' | 'idea';

/** Own markup, not fumadocs': theirs has a shadow and an inset rule inside the rounded box.
 *  `ink` colours the icon, title and rule; `fill` the surface — amber's ink is too brown. */
const ACCENT: Record<Type, { ink: string; fill: string; Icon: typeof Info }> = {
  info: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Info },
  tip: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Info },
  idea: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Lightbulb },
  warn: { ink: 'var(--brand-3-ink)', fill: 'var(--brand-3-fill)', Icon: TriangleAlert },
  warning: { ink: 'var(--brand-3-ink)', fill: 'var(--brand-3-fill)', Icon: TriangleAlert },
  error: { ink: 'var(--color-fd-error)', fill: 'var(--color-fd-error)', Icon: CircleX },
  success: { ink: 'var(--color-fd-success)', fill: 'var(--color-fd-success)', Icon: CircleCheck },
};

interface Props {
  type?: Type;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Callout({ type = 'info', title, icon, className, children }: Props) {
  const { ink, fill, Icon } = ACCENT[type] ?? ACCENT.info;

  return (
    /* The app's InfoBox (ui/src/components/InfoBox.vue): a 10% wash of the accent, no border,
       one inset hairline along the bottom, and a title in the accent over a short rule. */
    <div
      style={{ '--callout-ink': ink, '--callout-fill': fill } as CSSProperties}
      className={[
        'my-4 rounded-lg px-4 py-2',
        'bg-[color-mix(in_oklab,var(--callout-fill)_10%,var(--color-fd-background))]',
        'shadow-[inset_0_-1px_0.5px_0_color-mix(in_oklab,var(--callout-ink)_20%,transparent)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* With a title the icon rides in the header, as the app's `iconHeader` slot does;
          on its own the body keeps it. */}
      {title ? (
        <p className="relative m-0! mb-2! inline-flex items-start gap-1.5 pb-1 text-sm font-medium text-[color:var(--callout-ink)]">
          {icon ?? <Icon className="mt-[0.15em] size-4 shrink-0" aria-hidden />}
          {title}
          <span
            aria-hidden
            className="absolute bottom-0 left-0 h-[0.1875rem] w-1/3 min-w-4 rounded-full bg-[color-mix(in_oklab,var(--callout-ink)_20%,transparent)]"
          />
        </p>
      ) : null}

      <div className="flex gap-2">
        {title
          ? null
          : (icon ?? (
              <Icon
                className="mt-[0.2em] size-4 shrink-0 text-[color:var(--callout-ink)]"
                aria-hidden
              />
            ))}
        <div className="prose-no-margin min-w-0 flex-1 text-fd-foreground">{children}</div>
      </div>
    </div>
  );
}
