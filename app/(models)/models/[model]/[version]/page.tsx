import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelRoute, modelMetadata } from '@/components/models/model-page/model-route';
import { getBaseModel, getBaseModels } from '@/lib/models';

// Every version but a base model's default, which is the base model's own page.
export const dynamicParams = false;

// A static export needs one page, so a build without versions still emits a 404 here.
const UNAVAILABLE = 'unavailable';

export async function generateStaticParams() {
  const params = (await getBaseModels()).flatMap((view) =>
    Object.values(view.versionSlugs)
      .filter(Boolean)
      .map((version) => ({ model: view.id, version })),
  );
  return params.length ? params : [{ model: UNAVAILABLE, version: UNAVAILABLE }];
}

type Params = { params: Promise<{ model: string; version: string }> };

async function load(props: Params) {
  const { model, version } = await props.params;
  const view = await getBaseModel(model);
  const card = view?.versions.find((candidate) => version && view.versionSlugs[candidate.id] === version);
  if (!view || !card) notFound();
  return { view, card };
}

export default async function VersionPage(props: Params) {
  const { view, card } = await load(props);
  return <ModelRoute view={view} card={card} />;
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { view, card } = await load(props);
  return modelMetadata(view, card);
}
