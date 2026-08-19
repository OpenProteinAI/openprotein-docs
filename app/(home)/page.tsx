import { Button } from '@/components/site/button';

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-(--fd-layout-width) px-4 py-13">
      <h1 className="mb-4.5 text-4xl font-bold leading-[1.15] tracking-[-1px] text-fd-foreground">
        Data-Driven Protein Engineering
      </h1>
      <p className="mb-4 max-w-[82ch] text-[15px] leading-[1.75] text-fd-foreground">
        OpenProtein.AI provides state-of-the-art machine learning models for integration
        into your protein engineering workflows. Run function prediction, structure
        prediction, and <em>de novo</em> protein design tools, packaged in our easy-to-use
        platform.
      </p>
      <p className="mb-7 max-w-[82ch] text-[15px] leading-[1.75] text-fd-foreground">
        Train custom models or get predictions from our pre-trained foundation models and
        generative protein language models like AlphaFold2, ESM, and PoET.
      </p>

      <div className="flex flex-wrap items-center gap-3.5 rounded-[0.75em] border border-fd-border bg-fd-muted px-5 py-4">
        <span className="text-sm font-semibold text-fd-foreground">Getting started</span>
        <span className="text-[13.5px] text-fd-muted-foreground">
          Learn more about our tools →
        </span>
        <span className="ml-auto flex flex-wrap gap-2.5">
          <Button variant="main" href="/getting-started">
            With no code
          </Button>
          <Button variant="secondary" href="/python-api">
            With the API
          </Button>
        </span>
      </div>
    </main>
  );
}
