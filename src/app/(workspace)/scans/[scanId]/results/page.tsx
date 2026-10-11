import { FlowSteps, improveFlow } from '@/components/common/flow-steps';
import { ScanResults } from '@/features/scans/scan-results';

export default async function ScanResultsPage(props: PageProps<'/scans/[scanId]/results'>) {
  const { scanId } = await props.params;
  return (
    <>
      <FlowSteps items={improveFlow} current={0} />
      <ScanResults scanId={scanId} />
    </>
  );
}
