import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** The platform UI's spinner. */
export function Loader({ className }: { className?: string }) {
  return (
    <svg className={cn('op-loader', className)} fill="none" viewBox="0 0 66 66" aria-hidden>
      <circle cx="33" cy="33" r="28" strokeWidth="6" className="stroke-fd-primary/10" />
      <circle
        cx="33"
        cy="33"
        r="28"
        strokeWidth="6"
        strokeDasharray="1, 174"
        strokeDashoffset="306"
        strokeLinecap="round"
        className="stroke-fd-primary"
      />
    </svg>
  );
}

/** A centred Loader that fades in, as the platform UI's LoadingSection. */
export function LoadingSection({ label, className, ...props }: ComponentProps<'div'> & { label: string }) {
  return (
    <div role="status" aria-label={label} className={cn('op-loading', className)} {...props}>
      <Loader />
    </div>
  );
}
