import Link from 'next/link';
import { Button } from '@/components/site/button';
import { LINK } from '@/lib/link';
import { PY_API_URL, REST_API_URL, SITE } from '@/lib/site';

export function Hero() {
  return (
    <section className="pt-4 pb-0">
      {/* The Quickstart / SDK calls to action sit on the title line; on narrow screens they
          drop below it. */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-medium tracking-tight text-fd-foreground">
          OpenProtein.AI Documentation
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="main" href="/quickstart">
            Quickstart Guide
          </Button>
          <Button variant="secondary" href="/references">
            API Reference
          </Button>
        </div>
      </div>
      <p className="mb-3 leading-relaxed text-pretty text-fd-foreground">
        OpenProtein.AI provides state-of-the-art foundation models for integration in your
        protein engineering workflow. You can{' '}
        <Link href="/tutorials/design/generate/rfdiffusion?client=app" className={LINK}>
          design new proteins
        </Link>
        ,{' '}
        <Link href="/tutorials/predict/plm/one-shot-variant-library" className={LINK}>
          get mutations suggested by our language models
        </Link>
        , and{' '}
        <Link href="/tutorials/design/active-learning/antibody-engineering" className={LINK}>
          train custom models on your data
        </Link>
        , and more – all on our easy-to-use platform.
      </p>

      <p className="leading-relaxed text-pretty text-fd-foreground">
        Explore our suite of tools and how to access them via our{' '}
        <Link href={SITE.appUrl} className={LINK}>
          Web App
        </Link>
        ,{' '}
        <Link href={PY_API_URL} className={LINK}>
          Python API
        </Link>
        , or{' '}
        <Link href={REST_API_URL} className={LINK}>
          REST API
        </Link>
        .
      </p>
    </section>
  );
}
