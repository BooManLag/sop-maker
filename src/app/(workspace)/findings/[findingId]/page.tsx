import { BackLink } from '@/components/common/back-link';
import { FindingDetail } from '@/features/findings/finding-detail';

export default async function FindingPage(props: PageProps<'/findings/[findingId]'>) {
  const { findingId } = await props.params;
  return (
    <>
      <BackLink href="/findings" />
      <FindingDetail findingId={findingId} />
    </>
  );
}
