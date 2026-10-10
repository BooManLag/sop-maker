import { BackLink } from '@/components/page/back-link';
import { FlowSteps, improveFlow } from '@/components/page/flow-steps';
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
