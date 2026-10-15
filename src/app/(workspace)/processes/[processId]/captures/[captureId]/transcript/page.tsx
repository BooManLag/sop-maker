import { BackLink } from '@/components/common/back-link';
import { FlowSteps, createFlow } from '@/components/common/flow-steps';
import { PageTitle } from '@/components/common/page-title';
import { TranscriptCheck } from '@/features/capture/transcript-check';

export default async function TranscriptPage(
  props: PageProps<'/processes/[processId]/captures/[captureId]/transcript'>,
) {
  const { processId, captureId } = await props.params;
  return (
    <>
      <BackLink href="/processes/new" />
      <FlowSteps items={createFlow} current={0} />
      <PageTitle
        eyebrow="TRANSCRIPT · CHECK BEFORE STEPS"
        title="Check what the recording says."
        description="Fix any misheard words. Draft steps are built from the recording; you can edit them next."
      />
      <TranscriptCheck processId={processId} captureId={captureId} />
    </>
  );
}
