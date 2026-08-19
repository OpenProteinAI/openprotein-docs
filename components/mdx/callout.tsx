import type { ComponentProps } from 'react';
import { Callout as FumaCallout } from 'fumadocs-ui/components/callout';

type Type = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'idea';

/** fumadocs tints callouts with neutral greys; the mockup tints them by type. */
const TINT: Record<Type, string> = {
  info: 'bg-[color-mix(in_oklab,var(--brand-1-fill)_6%,transparent)] border-[color-mix(in_oklab,var(--brand-1-fill)_28%,transparent)]',
  idea: 'bg-[color-mix(in_oklab,var(--brand-1-fill)_6%,transparent)] border-[color-mix(in_oklab,var(--brand-1-fill)_28%,transparent)]',
  warn: 'bg-[color-mix(in_oklab,var(--brand-3-fill)_12%,transparent)] border-[color-mix(in_oklab,var(--brand-3-fill)_55%,transparent)]',
  warning:
    'bg-[color-mix(in_oklab,var(--brand-3-fill)_12%,transparent)] border-[color-mix(in_oklab,var(--brand-3-fill)_55%,transparent)]',
  error:
    'bg-[color-mix(in_oklab,var(--color-fd-error)_8%,transparent)] border-[color-mix(in_oklab,var(--color-fd-error)_35%,transparent)]',
  success:
    'bg-[color-mix(in_oklab,var(--color-fd-success)_8%,transparent)] border-[color-mix(in_oklab,var(--color-fd-success)_35%,transparent)]',
};

export function Callout({
  type = 'info',
  className,
  ...props
}: ComponentProps<typeof FumaCallout>) {
  const tint = TINT[(type ?? 'info') as Type] ?? TINT.info;
  return <FumaCallout type={type} className={[tint, className].filter(Boolean).join(' ')} {...props} />;
}
