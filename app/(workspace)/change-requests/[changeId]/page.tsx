import { BackLink } from '@/components/page/back-link';
import { ChangeRequestReview } from '@/features/changes/change-request';

export default async function ChangeRequestPage(props: PageProps<'/change-requests/[changeId]'>) {
  const { changeId } = await props.params;
  return (
    <>
      <BackLink href="/trials" />
      <ChangeRequestReview changeId={changeId} />
    </>
  );
}
