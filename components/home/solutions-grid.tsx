import Link from 'next/link';
import { Dna, FlaskConical, Layers } from 'lucide-react';
import { SOLUTIONS } from '@/lib/home-content';

const ICONS = { dna: Dna, flask: FlaskConical, layers: Layers };

export function SolutionsGrid() {
  return (
    <section className="pt-13 pb-20">
      <h2 className="mb-1.5 text-2xl font-semibold tracking-[-0.5px] text-fd-foreground">
        Solutions for your application
      </h2>
      <p className="mb-6 text-base text-fd-muted-foreground">
        Walkthroughs built around the molecules teams bring to the platform.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SOLUTIONS.map((solution) => {
          const Icon = ICONS[solution.icon];
          return (
            <Link
              key={solution.title}
              href={solution.href}
              className="flex gap-5 rounded-[0.75em] border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/75"
            >
              <span
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: solution.tint, color: solution.ink }}
              >
                <Icon className="size-8" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-lg font-semibold text-fd-foreground">
                  {solution.title}
                </span>
                <span className="mt-1 mb-3.5 text-sm leading-relaxed text-pretty text-fd-muted-foreground">
                  {solution.body}
                </span>
                <span className="mt-auto flex flex-wrap gap-1.5">
                  {solution.properties.map((property) => (
                    <span
                      key={property}
                      className="rounded-full border border-fd-border px-2.5 py-0.5 text-xs text-fd-foreground"
                    >
                      {property}
                    </span>
                  ))}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
