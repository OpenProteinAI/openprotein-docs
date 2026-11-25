import { Hero } from '@/components/home/hero';
import { HomeModels } from '@/components/home/home-models';
import { SiteIndex } from '@/components/home/site-index';
import { WorkflowExplorer } from '@/components/home/workflow-explorer';
import { LANDING_COLUMN } from '@/lib/columns';

export default function HomePage() {
  return (
    <div className={LANDING_COLUMN}>
      <Hero />
      <WorkflowExplorer />
      <HomeModels />
      <SiteIndex />
    </div>
  );
}
