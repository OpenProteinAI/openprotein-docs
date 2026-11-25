// public/logo*.svg are the product's own theme assets, so "Docs" is markup here rather than
// a path inside the file. Its size tracks the mark: the wordmark's cap height is 0.42 of the
// file's height, which Roboto renders at ~0.6em. A lockup, so off the type scale (TYPOGRAPHY.md).
import { withBase } from '@/lib/base-path';

const SIZES = {
  sm: { img: 'h-6', rule: 'h-4', label: 'text-[0.875rem]' },
  md: { img: 'h-[2.125rem]', rule: 'h-5', label: 'text-[1.3125rem]' },
};

const LOGO_NAME = 'OpenProtein.AI Docs';

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

interface Props {
  size?: keyof typeof SIZES;
  /** Drop the wordmark for the bare mark where the header row is too narrow for it. */
  responsive?: boolean;
  /** The all-white lockup for the navy footer, where the theme does not decide the surface. */
  onDark?: boolean;
  className?: string;
}

export function Logo({ size = 'md', responsive = false, onDark = false, className }: Props) {
  const { img, rule, label } = SIZES[size];

  return (
    <span role="img" aria-label={LOGO_NAME} className={join('flex items-center gap-2', className)}>
      {responsive ? (
        <img src={withBase('/logo.svg')} alt="" width={34} height={34} className={`${img} w-auto sm:hidden lg:block nav:hidden`} />
      ) : null}

      <span className={responsive ? 'hidden sm:block lg:hidden nav:block' : undefined}>
        {onDark ? (
          /* The marketing site's own footer lockup, so the two footers carry the same mark. */
          <img src={withBase('/logo_full_white.svg')} alt="" width={238} height={38} className={`${img} w-auto`} />
        ) : (
          /* The two files differ only in the wordmark's fill, hard-coded #233E96 and 1.62:1 on dark. */
          <>
            <img src={withBase('/logo_full.svg')} alt="" width={139} height={19} className={`${img} w-auto dark:hidden`} />
            <img src={withBase('/logo_full_dark.svg')} alt="" width={139} height={19} className={`hidden ${img} w-auto dark:block`} />
          </>
        )}
      </span>

      <span className={join('w-px', onDark ? 'bg-white/40' : 'bg-fd-border', rule)} />
      <span
        className={join(
          'leading-none',
          onDark ? 'text-white' : 'text-[color:var(--brand-2-ink)]',
          label,
        )}>
        Docs
      </span>
    </span>
  );
}
