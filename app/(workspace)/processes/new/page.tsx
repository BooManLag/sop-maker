import { BackLink } from '@/components/page/back-link';
import { FlowSteps, createFlow } from '@/components/page/flow-steps';
import { PageTitle } from '@/components/page/page-title';
import { CaptureForm } from '@/features/capture/capture-form';

export default function NewProcessPage() {
  return (
    <>
      <BackLink href="/" />
      <FlowSteps items={createFlow} current={0} />
      <PageTitle
        eyebrow="CREATE YOUR FIRST SOP"
        title="Show us how the job is actually done."
        description="Start with a walkthrough. We'll help turn the know-how into a useful standard."
      />
      <CaptureForm />
    </>
  );
}
