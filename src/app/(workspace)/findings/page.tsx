import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/common/page-title';
import { Principle } from '@/components/common/principle';
import { FindingsList } from '@/features/findings/findings-list';

export default function FindingsPage() {
  return (
    <>
      <PageTitle
        eyebrow="BETTER PRACTICES, NOT BETTER PEOPLE"
        title="Findings worth a conversation."
        description="Promising differences from the field. Evidence to investigate, not instructions to change your SOP."
        action={
          <Button asChild>
            <Link href="/scans/new">
              <Search size={16} aria-hidden />
              New scan
            </Link>
          </Button>
        }
      />
      <FindingsList />
      <Principle>Historical correlation opens a question. A controlled trial tests it.</Principle>
    </>
  );
}
