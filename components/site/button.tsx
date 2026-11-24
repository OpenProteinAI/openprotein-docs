import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The platform UI's six `op-btn` appearances. The styles are in app/global.css. */
export type ButtonVariant = 'main' | 'primary' | 'secondary' | 'text' | 'flat' | 'contour-white';
export type ButtonSize = 'default' | 'compact' | 'lg';

// --bs-control-min-height and its compact twin; min-height, not height, so a button
// that wraps grows the way the UI's does.
const SIZES: Record<ButtonSize, string> = {
  default: 'min-h-8 px-4 py-1 text-sm',
  compact: 'min-h-[1.875rem] px-3 py-1 text-sm',
  lg: 'min-h-10 px-5 py-2 text-base',
};

// These two carry their own padding and radius in CSS, as they do in the UI.
const SELF_SIZED = new Set<ButtonVariant>(['text', 'contour-white']);

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  /** Saves `href` instead of navigating to it; renders a plain <a>, not a Link. */
  download?: string;
  /** Full page load, for an `href` that is a route handler rather than a page. */
  native?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** `is--selected`: the held-down state of a flat or contour-white toggle. */
  selected?: boolean;
  /** `is--highlighted`: the brand underline a flat button wears when it marks the current thing. */
  highlighted?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  href,
  external,
  download,
  native,
  disabled,
  readOnly,
  selected,
  highlighted,
  className,
  children,
  ...rest
}: Props & Omit<ComponentProps<'button'>, keyof Props>) {
  const shared = {
    className: cn(
      'op-btn',
      `op-btn--${variant}`,
      SELF_SIZED.has(variant) ? undefined : SIZES[size],
      className,
    ),
    'data-readonly': readOnly ? true : undefined,
    'data-selected': selected ? true : undefined,
    'data-highlighted': highlighted ? true : undefined,
  };
  const content = <span className="op-btn__content">{children}</span>;

  // A disabled link is still a link, so fall back to a button the way the UI does.
  if (href && !disabled) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" title={rest.title} {...shared}>
          {content}
        </a>
      );
    }

    // A download is a response to save and a native href is a route handler: neither is a page to prefetch.
    if (download !== undefined || native) {
      return (
        <a href={href} download={download} {...shared}>
          {content}
        </a>
      );
    }

    return (
      <Link href={href} {...shared}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled || readOnly} {...shared} {...rest}>
      {content}
    </button>
  );
}

/** op-btn-group: segmented, shared borders. */
export function ButtonGroup({
  vertical,
  className,
  children,
}: {
  vertical?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex [&>*]:rounded-none',
        vertical
          ? 'flex-col [&>*:first-child]:rounded-t-[0.75em] [&>*:last-child]:rounded-b-[0.75em] [&>*+*]:-mt-px'
          : '[&>*:first-child]:rounded-l-[0.75em] [&>*:last-child]:rounded-r-[0.75em] [&>*+*]:-ml-px',
        className,
      )}
    >
      {children}
    </span>
  );
}
