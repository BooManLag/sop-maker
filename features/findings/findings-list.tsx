'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/page/empty-state';
import { ErrorBanner } from '@/components/page/error-banner';
import { QuietDisclosure } from '@/components/page/disclosure';
import { QueryState } from '@/components/page/query-state';
import { api } from '@/lib/client/browser';
import { useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import type { Finding } from '@/lib/domain';
import { relativeReduction } from '@/lib/sop/findings';
import { gradeLabel, gradeTone } from './grade';

export function FindingsList() {
  const restore = useWorkspaceMutation(api.restoreFinding);
  return (
    <QueryState query={useWorkspace()}>
      {({ findings, processes }) => {
        const active = findings.filter((f) => f.status !== 'dismissed');
        const dismissed = findings.filter((f) => f.status === 'dismissed');
        const processTitles = [
          ...new Set(active.map((f) => processes.find((p) => p.id === f.processId)?.title)),
        ];
        return (
          <>
            <ErrorBanner error={restore.error} onDismiss={restore.reset} />
            <div className="mb-5 flex justify-between gap-2.5 text-tiny text-brand-500 sm:text-xs">
              <span>{active.length} candidate practices</span>
              <span className="text-2xs text-brand-400 sm:text-xs">
                Sample scenario{processTitles.filter(Boolean).map((t) => ` · ${t}`)}
              </span>
            </div>
            {active.length ? (
              active.map((f) => <FindingCard key={f.id} finding={f} />)
            ) : (
              <EmptyState
                title="No active findings."
                description="Start a sample scan to explore the evidence workflow."
              />
            )}
            {dismissed.length > 0 && (
              <QuietDisclosure
                summary={`${dismissed.length} dismissed ${dismissed.length === 1 ? 'finding' : 'findings'}`}
              >
                {dismissed.map((f) => (
                  <p key={f.id} className="flex flex-wrap items-center gap-3">
                    {f.title}
                    <Button
                      variant="secondary"
                      disabled={restore.isPending}
                      onClick={() =>
                        restore.mutate(f.id, {
                          onSuccess: () => toast.success('Finding restored.'),
                        })
                      }
                    >
                      Restore finding
                    </Button>
                  </p>
                ))}
              </QuietDisclosure>
            )}
          </>
        );
      }}
    </QueryState>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="mb-4 flex flex-col justify-between gap-4.5 rounded-lg border border-border bg-card p-6 sm:flex-row md:gap-7.5 md:p-7">
      <div>
        <Badge tone={gradeTone(finding.grade)}>{gradeLabel(finding.grade)}</Badge>
        <h2 className="mt-4.5 mb-3 text-lg tracking-[-0.55px]">{finding.title}</h2>
        <p className="mb-5.5 max-w-[590px] text-sm">{finding.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground [&>span+span]:before:mr-1 [&>span+span]:before:text-subtle-foreground [&>span+span]:before:content-['·']">
          <span>{finding.technicians} technicians</span>
          <span>{finding.evidence.sampleSize} comparable jobs</span>
          <span>{finding.grade === 'strong' ? 'Held on later jobs' : 'Small sample'}</span>
        </div>
      </div>
      <div className="flex min-w-[145px] flex-col items-start gap-1.5 border-t border-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4.5 md:min-w-[165px] md:pl-7">
        <strong className="text-5xl font-normal tracking-[-1.5px] text-brand-600 sm:text-4xl">
          {relativeReduction(finding)}%
        </strong>
        <span className="text-xs text-brand-500">fewer callbacks</span>
        <small className="text-2xs text-brand-400">
          {finding.evidence.demonstration ? 'Illustrative association' : 'Historical association'}
        </small>
        <Button variant="secondary" className="mt-3.5" asChild>
          <Link href={`/findings/${finding.id}`}>
            Review finding
            <ArrowRight size={15} aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
