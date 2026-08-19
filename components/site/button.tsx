import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant = 'main' | 'primary' | 'secondary' | 'flat';
export type ButtonSize = 'default' | 'compact' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[0.75em] text-sm font-medium whitespace-nowrap transition-[background,border-color,color,filter] disabled:pointer-events-none data-[readonly=true]:pointer-events-none';

// Fills stay at base brand colours: white on a dark-lifted gradient drops to 2.55:1.
const VARIANTS: Record<ButtonVariant, string> = {
  main: 'font-semibold text-white shadow-[0_6px_16px_-8px_rgb(34_94_219/0.9)] hover:brightness-108',
  primary: 'font-semibold text-white hover:brightness-108',
  secondary:
    'border border-fd-border bg-fd-background text-fd-foreground hover:border-[color-mix(in_oklab,var(--brand-1-fill)_75%,transparent)] hover:text-fd-foreground',
  flat: 'text-fd-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'h-[34px] px-4',
  compact: 'h-[30px] px-3',
  lg: 'h-10 px-5 text-base',
};

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  readOnly?: boolean;
  className?: string;
  children?: ReactNode;
}

function styles({ variant = 'primary', size = 'default', className }: Props) {
  return [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ');
}

function fill(variant: ButtonVariant) {
  if (variant === 'main') return { background: 'var(--brand-gradient)' };
  if (variant === 'primary') return { background: 'var(--brand-1-fill)' };
  return undefined;
}

export function Button({
  variant = 'primary',
  size = 'default',
  href,
  external,
  readOnly,
  className,
  children,
  ...rest
}: Props & Omit<ComponentProps<'button'>, keyof Props>) {
  const shared = {
    className: styles({ variant, size, className }),
    style: fill(variant),
    'data-readonly': readOnly ? true : undefined,
  };

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" {...shared}>
        {children}
      </a>
    ) : (
      <Link href={href} {...shared}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" {...shared} {...rest}>
      {children}
    </button>
  );
}

/** op-btn-group: segmented, shared borders. */
export function ButtonGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={[
        'inline-flex [&>*]:rounded-none [&>*:first-child]:rounded-l-[0.75em] [&>*:last-child]:rounded-r-[0.75em] [&>*+*]:-ml-px',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
