import { CapabilityGrid } from '@/components/home/capability-grid';
import { Hero } from '@/components/home/hero';
import { SolutionsGrid } from '@/components/home/solutions-grid';
import { LANDING_COLUMN } from '@/lib/columns';

export default function HomePage() {
  return (
    <div className={LANDING_COLUMN}>
      <Hero />
      <CapabilityGrid />
      <SolutionsGrid />
    </div>
  );
}
