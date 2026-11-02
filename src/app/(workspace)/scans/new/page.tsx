import { BackLink } from '@/components/common/back-link';
import { FlowSteps, improveFlow } from '@/components/common/flow-steps';
import { PageTitle } from '@/components/common/page-title';
import { ScanSetup } from '@/features/scans/scan-setup';

export default async function NewScanPage(props: PageProps<'/scans/new'>) {
  const { processId } = await props.searchParams;
  return (
    <>
      <BackLink href="/" />
      <FlowSteps items={improveFlow} current={0} />
      <PageTitle
        eyebrow="IMPROVE AN EXISTING SOP"
        title="Find practices worth investigating."
        description="Compare your standard with real service records. Start by checking the evidence."
      />
      <ScanSetup requestedProcessId={typeof processId === 'string' ? processId : undefined} />
    </>
  );
}
