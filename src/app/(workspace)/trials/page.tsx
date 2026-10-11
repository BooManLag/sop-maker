import { PageTitle } from '@/components/common/page-title';
import { TrialList } from '@/features/trials/trial-list';

export default function TrialsPage() {
  return (
    <>
      <PageTitle
        eyebrow="PROVE BEFORE YOU CHANGE"
        title="Validation trials"
        description="Controlled comparisons between a candidate practice and your current SOP."
      />
      <TrialList />
    </>
  );
}
