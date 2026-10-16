import { Principle } from '@/components/common/principle';
import { Hero } from '@/features/overview/hero';
import { WhereThingsStand } from '@/features/overview/where-things-stand';

export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <Hero />
      <WhereThingsStand />
      <Principle>
        Evidence opens the conversation. <strong>Your people approve the change.</strong>
      </Principle>
    </div>
  );
}
