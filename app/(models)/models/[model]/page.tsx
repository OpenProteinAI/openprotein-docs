import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelRoute, modelMetadata } from '@/components/models/model-page/model-route';
import { getBaseModel, getBaseModels } from '@/lib/models';

// The base models /models lists at build time; a new one appears with the next build.
export const dynamicParams = false;

// A static export needs one page, so a build that can't read the models still emits a 404 here.
const UNAVAILABLE = 'unavailable';

export async function generateStaticParams() {
  const params = (await getBaseModels()).map((view) => ({ model: view.id }));
  return params.length ? params : [{ model: UNAVAILABLE }];
}

/** The base model, on its default version. */
async function load(props: { params: Promise<{ model: string }> }) {
  const view = await getBaseModel((await props.params).model);
  const card = view?.versions.find((version) => version.id === view.defaultVersion);
  if (!view || !card) notFound();
  return { view, card };
}

export default async function BaseModelPage(props: { params: Promise<{ model: string }> }) {
  const { view, card } = await load(props);
  return <ModelRoute view={view} card={card} />;
}

export async function generateMetadata(props: { params: Promise<{ model: string }> }): Promise<Metadata> {
  const { view, card } = await load(props);
  return modelMetadata(view, card);
}
