import { BackLink } from '@/components/common/back-link';
import { FlowSteps, createFlow } from '@/components/common/flow-steps';
import { Review } from '@/features/capture/review';
import { draftPath } from '@/features/capture/paths';

export default async function ReviewPage(
  props: PageProps<'/processes/[processId]/captures/[captureId]/review'>,
) {
  const { processId, captureId } = await props.params;
  return (
    <>
      <BackLink href={draftPath(processId, captureId, 'clarify')} />
      <FlowSteps items={createFlow} current={2} />
      <Review processId={processId} captureId={captureId} />
    </>
  );
}
