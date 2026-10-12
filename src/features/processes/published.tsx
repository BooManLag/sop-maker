'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/common/query-state';
import { useProcess } from '@/lib/client/queries';

export function Published({ processId }: { processId: string }) {
  return (
    <QueryState query={useProcess(processId)}>
      {(process) => (
        <div className="mx-auto my-15 max-w-[650px] text-center sm:my-[90px]">
          <span className="mx-auto mb-7 grid size-[70px] place-items-center rounded-full bg-brand-100 text-brand-600">
            <Check size={30} aria-hidden />
          </span>
          <Badge className="mb-6">Published · Version {process.currentVersion}</Badge>
          <h1 className="text-2xl leading-[1.13] tracking-[-1.6px] sm:text-4xl">
            Your know-how is now a standard.
          </h1>
          <p className="mt-5 mb-7.5">
            {process.title} is ready for the team.
            <br />
            The next improvement starts with what happens in the field.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Button asChild>
              <Link href={`/scans/new?processId=${process.id}`}>
                Improve this standard
                <ArrowRight size={16} aria-hidden />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/processes/${process.id}`}>View living SOP</Link>
            </Button>
          </div>
        </div>
      )}
    </QueryState>
  );
}
