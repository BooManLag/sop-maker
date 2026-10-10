import { Principle } from '@/components/page/principle';
import { Hero } from '@/features/overview/hero';
import { PathCards } from '@/features/overview/path-cards';
import { FeaturedFinding } from '@/features/overview/featured-finding';
import { LivingStandards } from '@/features/overview/living-standards';

export default function OverviewPage() {
  return (
    <>
      <Hero />
      <PathCards />
      <FeaturedFinding />
      <LivingStandards />
      <Principle aside="Sample data throughout">
        Evidence opens the conversation. <strong>Your people approve the change.</strong>
      </Principle>
    </>
  );
}
