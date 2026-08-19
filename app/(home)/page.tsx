import { CapabilityGrid } from '@/components/home/capability-grid';
import { Hero } from '@/components/home/hero';
import { SolutionsGrid } from '@/components/home/solutions-grid';
import { SiteFooter } from '@/components/site/footer';

export default function HomePage() {
  return (
    <>
      <div className="mx-auto w-full max-w-(--fd-layout-width) px-4">
        <Hero />
        <CapabilityGrid />
        <SolutionsGrid />
      </div>
      <SiteFooter />
    </>
  );
}
