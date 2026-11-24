import { useId, type SVGProps } from 'react';

/** `sequence.svg` in the app (ui/src/themes/default/img). */
export function DeNovoDesignIcon(props: SVGProps<SVGSVGElement>) {
  // Both layouts render every icon, so the exported clip id would repeat. React 19 wraps useId
  // in guillemets, which url(#...) cannot carry.
  const clip = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
<g clipPath={`url(#${clip})`}>
<path d="M16.0867 14.3098C15.0773 11.5877 7.377 14.9785 6.36761 12.2563L7.75079 15.9865C8.76024 18.7087 16.4604 15.3178 17.4699 18.04L16.0867 14.3098Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M11.9202 4.30978C10.9108 1.58765 3.2105 4.97847 2.20111 2.25634L3.58428 5.98649C4.59373 8.70868 12.2939 5.31782 13.3034 8.03997L11.9202 4.30978Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M13.4829 7.58875C14.694 10.2273 6.85141 13.2746 8.0625 15.9132L6.40294 12.2975C5.19185 9.65884 13.0344 6.61166 11.8233 3.97305L13.4829 7.58875Z" fill="var(--icon-bg, #fff)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<defs>
<clipPath id={clip}>
<rect width="20" height="20" fill="#fff"/>
</clipPath>
</defs>
</svg>
  );
}
