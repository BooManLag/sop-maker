import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/page/page-title';
import { ProcessList } from '@/features/processes/process-list';

export default function ProcessesPage() {
  return (
    <>
      <PageTitle
        eyebrow="LIVING STANDARDS"
        title="Processes"
        description="Your team's know-how, reviewed and ready to use."
        action={
          <Button asChild>
            <Link href="/processes/new">
              <Plus size={16} aria-hidden />
              Create first SOP
            </Link>
          </Button>
        }
      />
      <ProcessList />
    </>
  );
}
