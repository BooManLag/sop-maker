import { BackLink } from '@/components/page/back-link';
import { FlowSteps, improveFlow } from '@/components/page/flow-steps';
import { PageTitle } from '@/components/page/page-title';
import { TrialPlanForm } from '@/features/trials/trial-plan-form';

export default async function NewTrialPage(props: PageProps<'/findings/[findingId]/trial'>) {
  const { findingId } = await props.params;
  return (
    <>
      <BackLink href={`/findings/${findingId}`} />
      <FlowSteps items={improveFlow} current={2} />
      <PageTitle
        eyebrow="CONTROLLED VALIDATION · DEMO"
        title="Test it deliberately."
        description="Give the practice a fair comparison before it becomes a proposed change."
      />
      <TrialPlanForm findingId={findingId} />
    </>
  );
}
