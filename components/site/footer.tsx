import Link from 'next/link';
import { Logo } from '@/components/site/logo';
import { FOOTER_ADDRESS, FOOTER_COLUMNS, FOOTER_LEGAL, FOOTER_SOCIALS } from '@/lib/home-content';
import { SHELL_COLUMN } from '@/lib/columns';

/** The marketing site's pill. Its row carries -ml-4, so the text still starts at the column edge. */
const LINK = 'rounded-2xl px-4 py-1 text-sm text-white transition-colors hover:bg-[var(--brand-1-fill)]';

function FooterLink({ href, label }: { href: string; label: string }) {
  return href.startsWith('http') ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {label}
    </a>
  ) : (
    <Link href={href} className={LINK}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--footer-surface)] text-white">
      <div className={`flex flex-col gap-10 py-11 lg:flex-row lg:items-start lg:justify-between ${SHELL_COLUMN}`}>
        <div>
          <Logo onDark />
          <p className="mt-2.5 max-w-[22rem] text-sm leading-prose text-white/70">
            Protein engineering models, assay-driven design, and structure prediction in one platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:gap-x-20">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="mb-3 text-2xs font-semibold tracking-caps uppercase text-white/60">
                {column.title}
              </div>
              <div className="-ml-4 flex flex-col items-start gap-0.5">
                {column.links.map((link) => (
                  <FooterLink key={link.label} href={link.href} label={link.label} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start gap-5">
          <div className="flex items-center gap-5">
            {FOOTER_SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                <img src={social.icon} alt="" width={24} height={24} className="h-6 w-6" />
              </a>
            ))}
          </div>

          <address className="flex flex-col gap-px text-sm not-italic text-white">
            {FOOTER_ADDRESS.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>

          <div className="flex flex-col items-start gap-1">
            <p className="text-sm text-white">
              Copyright © {new Date().getFullYear()} NE47 Bio – All Rights Reserved
            </p>
            <div className="-ml-4 flex flex-wrap items-center">
              {FOOTER_LEGAL.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
