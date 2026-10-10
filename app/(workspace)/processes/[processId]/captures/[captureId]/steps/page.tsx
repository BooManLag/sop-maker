import { BackLink } from '@/components/page/back-link';
import { FlowSteps, createFlow } from '@/components/page/flow-steps';
import { PageTitle } from '@/components/page/page-title';
import { DraftSteps } from '@/features/capture/draft-steps';

export default async function DraftStepsPage(
  props: PageProps<'/processes/[processId]/captures/[captureId]/steps'>,
) {
  const [{ processId, captureId }, { sample }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  return (
    <>
      <BackLink href="/processes/new" />
      <FlowSteps items={createFlow} current={0} />
      <PageTitle
        eyebrow="CANDIDATE STEPS · NOT A FINAL SOP"
        title="Here's the process we captured."
        description="Put the steps in order. Add anything the walkthrough missed."
      />
      <DraftSteps processId={processId} captureId={captureId} sample={sample === '1'} />
    </>
  );
}
