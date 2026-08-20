import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CAPABILITIES } from '@/lib/home-content';

export function CapabilityGrid() {
  return (
    <section className="pt-14 pb-2">
      <p className="mx-auto mb-7 max-w-[130ch] text-center text-base leading-relaxed text-fd-muted-foreground">
        Get started with OpenProtein.AI and discover functional protein sequences optimized
        to your specifications:
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((capability, index) => (
          <div
            key={capability.title}
            className="flex flex-col overflow-hidden rounded-[0.75em] border border-fd-border bg-fd-card transition-colors hover:border-fd-primary/75"
          >
            <Link
              href={capability.links[0].href}
              className="block aspect-square border-b border-fd-border"
              style={{ background: capability.tint }}
              tabIndex={-1}
              aria-hidden
            >
              <Image
                src={capability.image}
                alt=""
                width={400}
                height={400}
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                loading={index < 3 ? 'eager' : 'lazy'}
                className="size-full object-contain"
              />
            </Link>

            <div className="px-4 pt-3.5 pb-1">
              <Link
                href={capability.links[0].href}
                className="text-base leading-snug font-semibold text-pretty text-fd-foreground transition-colors hover:text-fd-primary"
              >
                {capability.title}
              </Link>
            </div>

            <div className="mt-auto flex flex-col px-4 pt-2 pb-3.5">
              {capability.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between gap-2 border-t border-fd-border py-1.5 text-sm text-fd-primary transition-colors hover:text-[color:var(--brand-2-ink)]"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
