import { BackLink } from '@/components/common/back-link';
import { FlowSteps, createFlow } from '@/components/common/flow-steps';
import { Review } from '@/features/capture/review';
import { draftPath } from '@/features/capture/paths';

export default async function ReviewPage(
  props: PageProps<'/processes/[processId]/captures/[captureId]/review'>,
) {
  const [{ processId, captureId }, { sample }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  return (
    <>
      <BackLink href={draftPath(processId, captureId, 'clarify', sample === '1')} />
      <FlowSteps items={createFlow} current={2} />
      <Review processId={processId} />
    </>
  );
}
