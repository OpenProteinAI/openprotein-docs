import { ArrowRightIcon } from '@/components/models/icons';
import { FloatingModelCard } from '@/components/models/floating-model-card';
import { Button } from '@/components/site/button';
import { baseModelViews } from '@/lib/base-models';
import { baseModelCards, buildModelCards } from '@/lib/model-cards';
import { getModelFamilyDocs, getSystemModels } from '@/lib/models';
import { MODELS_URL, versionPageUrl } from '@/lib/models-tree';

/** Desktop's 3×3; CSS hides the rest narrower. */
const MAX_CARDS = 9;

/** The app's home Models section: base models, most relevant first. */
export async function HomeModels() {
  const [models, families] = await Promise.all([getSystemModels(), getModelFamilyDocs()]);
  if (!models?.length) return null;

  const cards = baseModelCards(buildModelCards(models, families)).slice(0, MAX_CARDS);
  const pages = Object.fromEntries(
    baseModelViews(models, families).flatMap((view) =>
      view.versions.map((card) => [card.id, versionPageUrl(view, card.id)]),
    ),
  );

  return (
    <section className="op-models om-home pt-10 pb-2">
      <div className="mb-6 flex flex-wrap items-center gap-x-4">
        <h2 className="text-2xl font-semibold tracking-tight text-fd-foreground">Models</h2>
        <Button variant="text" href={MODELS_URL} className="py-0 no-underline hover:underline">
          See all models
          <ArrowRightIcon size={8} />
        </Button>
      </div>

      <div className="om-home-grid">
        {cards.map((card) => (
          <FloatingModelCard key={card.id} card={card} href={pages[card.id]} />
        ))}
      </div>
    </section>
  );
}
