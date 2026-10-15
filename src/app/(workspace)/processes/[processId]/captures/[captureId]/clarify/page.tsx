import { BackLink } from '@/components/common/back-link';
import { FlowSteps, createFlow } from '@/components/common/flow-steps';
import { Clarify } from '@/features/capture/clarify';
import { draftPath } from '@/features/capture/paths';

export default async function ClarifyPage(
  props: PageProps<'/processes/[processId]/captures/[captureId]/clarify'>,
) {
  const { processId, captureId } = await props.params;
  return (
    <>
      <BackLink href={draftPath(processId, captureId, 'steps')} />
      <FlowSteps items={createFlow} current={1} />
      <Clarify processId={processId} captureId={captureId} />
    </>
  );
}
