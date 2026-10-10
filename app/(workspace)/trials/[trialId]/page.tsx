import { BackLink } from '@/components/page/back-link';
import { TrialDetail } from '@/features/trials/trial-detail';

export default async function TrialPage(props: PageProps<'/trials/[trialId]'>) {
  const { trialId } = await props.params;
  return (
    <>
      <BackLink href="/trials" />
      <TrialDetail trialId={trialId} />
    </>
  );
}
