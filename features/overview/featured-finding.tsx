'use client';

import Link from 'next/link';
import { ArrowDownRight, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/page/section-header';
import { useWorkspace } from '@/lib/client/queries';
import { relativeReduction } from '@/lib/sop/findings';
import { gradeLabel } from '@/features/findings/grade';

/** Highlights the strongest open finding from the service records. */
export function FeaturedFinding() {
  const { data } = useWorkspace();
  const finding = data?.findings.find((f) => f.status !== 'dismissed' && f.grade === 'strong');
  if (!data || !finding) return null;
  const processTitle = data.processes.find((p) => p.id === finding.processId)?.title;
  const illustrative = finding.evidence.demonstration;

  return (
    <section className="mt-8 sm:mt-9.5 xl:mt-12">
      <SectionHeader
        eyebrow="FROM YOUR SERVICE RECORDS"
        title="A practice worth a closer look"
        link={{ href: '/findings', label: 'All findings' }}
      />
      <div className="grid rounded-lg border border-border bg-card p-6 sm:grid-cols-[1.35fr_0.9fr] sm:p-6 xl:grid-cols-[1.5fr_0.8fr_0.85fr]">
        <div>
          <Badge>{gradeLabel(finding.grade)}</Badge>
          <h3 className="mt-3.5 mb-2 text-xl leading-[1.25] tracking-[-0.7px] sm:text-lg md:text-xl">
            {finding.title}
          </h3>
          <p className="mb-4.5 text-sm leading-[1.8] text-muted-foreground sm:text-xs">
            {finding.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground [&>span+span]:before:mr-1 [&>span+span]:before:text-subtle-foreground [&>span+span]:before:content-['·']">
            {processTitle && (
              <span className="inline-flex items-center gap-1">
                <FileText size={14} aria-hidden />
                {processTitle}
              </span>
            )}
            <span>Baseline v{finding.evidence.sopVersion}</span>
            {illustrative && <span>Sample finding</span>}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5 sm:mt-0 sm:ml-4 sm:border-t-0 sm:border-l sm:pt-3.5 sm:pl-6 md:pl-9 xl:pt-3">
          <div className="mb-1.5 text-6xl leading-[1.1] tracking-[-2.7px] text-brand-600 md:text-7xl">
            {relativeReduction(finding)}
            <span className="text-2xl tracking-[-1px]">%</span>
            <ArrowDownRight
              size={26}
              aria-hidden
              className="ml-2 hidden align-middle text-brand-300 sm:inline-flex"
            />
          </div>
          <strong className="block text-sm font-medium text-brand-500">
            fewer 30-day callbacks
          </strong>
          <small className="text-2xs text-brand-400">
            {illustrative
              ? 'Associated in illustrative historical data'
              : 'Associated in historical data'}
          </small>
          <div className="mt-4 flex items-center gap-2 text-2xs text-brand-500">
            <CheckCircle2 size={15} aria-hidden />
            {finding.evidence.heldOutResult}
          </div>
        </div>

        <div className="col-span-full mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 xl:col-span-1 xl:mt-0 xl:flex-col xl:flex-nowrap xl:items-start xl:justify-center xl:gap-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
          <Button asChild>
            <Link href={`/findings/${finding.id}`}>
              Review finding
              <ArrowRight size={15} aria-hidden />
            </Link>
          </Button>
          <small className="text-2xs text-subtle-foreground">
            {finding.evidence.sampleSize} comparable jobs · {finding.technicians} technicians
          </small>
        </div>
      </div>
    </section>
  );
}
