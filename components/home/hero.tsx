import { Button } from '@/components/site/button';

export function Hero() {
  return (
    <section className="pt-16 pb-2 text-center">
      <h1 className="mb-5 text-4xl leading-tight font-bold tracking-[-1px] text-fd-foreground lg:text-5xl">
        Data-Driven Protein Engineering
      </h1>
      <p className="mx-auto mb-4 max-w-[130ch] text-base leading-relaxed text-pretty text-fd-foreground">
        OpenProtein.AI provides state-of-the-art machine learning models for integration
        into your protein engineering workflows. Run function prediction, structure
        prediction, and <em>de novo</em> protein design tools, packaged in our easy-to-use
        platform.
      </p>
      <p className="mx-auto mb-9 max-w-[130ch] text-base leading-relaxed text-pretty text-fd-muted-foreground">
        Train custom models or get predictions from our pre-trained foundation models and
        generative protein language models like AlphaFold2, ESM, and PoET. Our high
        performance APIs make large scale <em>in silico</em> screening for variant effect
        prediction and protein library design fast, easy, and cost effective.
      </p>

      <div className="flex flex-col items-center gap-4 rounded-[0.75em] border border-fd-border bg-fd-card px-7 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="text-xl font-semibold text-fd-foreground">Getting started</span>
          <span className="text-base text-fd-muted-foreground">
            Learn more about our tools →
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="main" size="lg" href="/getting-started/quickstart-web">
            With no code
          </Button>
          <Button variant="secondary" size="lg" href="/getting-started/quickstart-api">
            With the API
          </Button>
        </div>
      </div>
    </section>
  );
}
