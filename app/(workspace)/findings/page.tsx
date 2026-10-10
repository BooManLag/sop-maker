import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuietDisclosure } from '@/components/page/disclosure';
import { PageTitle } from '@/components/page/page-title';
import { Principle } from '@/components/page/principle';
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
      <QuietDisclosure summary="12 sample patterns did not survive validation">
        <p>
          Most differences do not become improvements. Illustrative rejected patterns include a
          shorter stabilization wait, an extra seal substitution, and early job closure. No SOP
          changes are proposed from these patterns.
        </p>
      </QuietDisclosure>
      <Principle>Historical correlation opens a question. A controlled trial tests it.</Principle>
    </>
  );
}
