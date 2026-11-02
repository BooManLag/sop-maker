import { BackLink } from '@/components/common/back-link';
import { FlowSteps, improveFlow } from '@/components/common/flow-steps';
import { Readiness } from '@/features/scans/readiness';

export default async function ScanReadinessPage(props: PageProps<'/scans/[scanId]'>) {
  const { scanId } = await props.params;
  return (
    <>
      <BackLink href="/scans/new" />
      <FlowSteps items={improveFlow} current={0} />
      <Readiness scanId={scanId} />
    </>
  );
}
