'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DefinitionList } from '@/components/page/definition-list';
import { Disclosure } from '@/components/page/disclosure';
import { ErrorBanner } from '@/components/page/error-banner';
import { Eyebrow } from '@/components/page/eyebrow';
import { PageTitle } from '@/components/page/page-title';
import { QueryState } from '@/components/page/query-state';
import { WithSideRail, sideRailClass } from '@/components/page/layouts';
import { api } from '@/lib/client/browser';
import { useFinding, useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import type { Finding, TechnicianResponse } from '@/lib/domain';
import { relativeReduction } from '@/lib/sop/findings';
import { OutcomeGrid } from './outcome-grid';

export function FindingDetail({ findingId }: { findingId: string }) {
  return (
    <QueryState query={useFinding(findingId)}>{(f) => <FindingReview finding={f} />}</QueryState>
  );
}

function FindingReview({ finding }: { finding: Finding }) {
  const router = useRouter();
  const processTitle = useWorkspace().data?.processes.find(
    (p) => p.id === finding.processId,
  )?.title;
  const explain = useWorkspaceMutation(() => api.requestExplanation(finding.id));
  const dismiss = useWorkspaceMutation(() => api.dismissFinding(finding.id));
  const strong = finding.grade === 'strong';
  const dismissed = finding.status === 'dismissed';
  const busy = explain.isPending || dismiss.isPending;

  return (
    <>
      <ErrorBanner
        error={explain.error ?? dismiss.error}
        onDismiss={() => {
          explain.reset();
          dismiss.reset();
        }}
      />
      <PageTitle
        eyebrow={[processTitle, finding.evidence.demonstration ? 'SAMPLE FINDING' : 'FINDING']
          .filter(Boolean)
          .join(' · ')
          .toUpperCase()}
        title={finding.title}
        description="A promising practice. A reason to investigate before changing the standard."
      />
      <WithSideRail>
        <div className="grid gap-5">
          <Comparison finding={finding} />
          <Card>
            <Eyebrow>DID THE OUTCOME IMPROVE?</Eyebrow>
            <OutcomeGrid
              outcomes={[
                {
                  label: 'Without extra check',
                  rate: finding.baselineRate,
                  caption: '30-day callbacks',
                },
                {
                  label: 'With extra check',
                  rate: finding.practiceRate,
                  caption: '30-day callbacks',
                  highlight: true,
                },
              ]}
              summary={
                <>
                  <strong className="text-4xl font-normal tracking-[-1.3px] md:text-3xl lg:text-5xl">
                    {relativeReduction(finding)}
                    <span className="ml-0.5 text-lg">
                      % <ArrowDownRight size={20} aria-hidden className="inline" />
                    </span>
                  </strong>
                  <span className="text-tiny">relative reduction</span>
                  <small className="text-2xs">Sample association, not causation</small>
                </>
              }
            />
          </Card>
          <TrustPanel finding={finding} />
          {explain.data && <ExpertResponse response={explain.data} />}
        </div>

        <Card className={`${sideRailClass} md:sticky md:top-6`}>
          <span className="mb-6 grid size-11 place-items-center rounded-lg bg-brand-100 text-brand-400">
            <FlaskConical size={24} aria-hidden />
          </span>
          <Eyebrow>WHAT SHOULD HAPPEN NEXT?</Eyebrow>
          <h2 className="mt-4.5 text-xl leading-[1.3]">
            {strong ? 'Worth a controlled trial.' : 'Gather more evidence.'}
          </h2>
          <p>
            {strong
              ? 'The historical signal is promising. Test this practice deliberately before proposing a new standard.'
              : 'A small sample is not enough. Collect comparable jobs and later outcomes before creating a trial.'}
          </p>
          <Button
            variant="secondary"
            disabled={busy || dismissed}
            onClick={() => explain.mutate(undefined)}
          >
            Ask technicians why
            <ArrowUpRight size={15} aria-hidden />
          </Button>
          {strong && !dismissed ? (
            <Button asChild>
              <Link href={`/findings/${finding.id}/trial`}>
                Create validation trial
                <ArrowRight size={15} aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button disabled>
              Create validation trial
              <ArrowRight size={15} aria-hidden />
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full pt-5.5 text-tiny"
            disabled={busy || dismissed}
            onClick={() =>
              dismiss.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Finding dismissed. The SOP was not changed.');
                  router.push('/findings');
                },
              })
            }
          >
            Dismiss finding
          </Button>
          <div className="mt-6 border-t border-border" />
          <small className="flex! items-start gap-2">
            <ShieldCheck size={16} aria-hidden className="shrink-0" />
            Practices are analyzed. People are never ranked.
          </small>
        </Card>
      </WithSideRail>
    </>
  );
}

function Comparison({ finding }: { finding: Finding }) {
  return (
    <div className="grid items-center gap-3 rounded-lg border border-border-strong bg-muted p-5 sm:grid-cols-[1fr_24px_1fr] lg:gap-5 lg:p-7">
      <div>
        <Eyebrow>THE STANDARD · V{finding.evidence.sopVersion}</Eyebrow>
        <h3 className="my-4 text-md leading-[1.55] md:text-base lg:text-md">{finding.standard}</h3>
        <span className="text-2xs text-brand-400">What was supposed to happen</span>
      </div>
      <ArrowRight size={23} aria-hidden className="mx-auto rotate-90 text-brand-300 sm:rotate-0" />
      <div>
        <Eyebrow>WHAT SOME TECHNICIANS DO</Eyebrow>
        <h3 className="my-4 text-md leading-[1.55] md:text-base lg:text-md">{finding.practice}</h3>
        <span className="text-2xs text-brand-400">A repeated field practice</span>
      </div>
    </div>
  );
}

function TrustPanel({ finding }: { finding: Finding }) {
  const signals = [
    'Compared technicians against their own jobs',
    'Similar equipment family',
    'Similar job conditions',
    finding.grade === 'strong'
      ? 'Pattern remained on later jobs'
      : 'Later-job evidence is still insufficient',
  ];
  const { evidence } = finding;
  return (
    <Card>
      <Eyebrow>WHY WE TRUST THIS SAMPLE SIGNAL</Eyebrow>
      {signals.map((signal) => (
        <p key={signal} className="my-4 flex items-center gap-2 text-sm text-brand-500">
          <CheckCircle2 size={17} aria-hidden className="text-brand-300" />
          {signal}
        </p>
      ))}
      <Disclosure summary="View statistical evidence">
        <p>{evidence.methodology}</p>
        <DefinitionList
          items={[
            ['Comparable jobs', evidence.sampleSize],
            ['SOP version', evidence.sopVersion],
            ['Analysis version', evidence.analysisVersion],
            ['Source record references', evidence.sourceRecordIds.join(', ')],
            ['Held-out result', evidence.heldOutResult],
          ]}
        />
        <p>
          No confidence interval or significance claim is calculated for this illustrative scenario.
        </p>
      </Disclosure>
    </Card>
  );
}

function ExpertResponse({ response }: { response: TechnicianResponse }) {
  return (
    <Card>
      <Badge>Sample expert explanation</Badge>
      <h2 className="mt-4 text-lg tracking-[-0.55px]">The why behind the practice.</h2>
      <blockquote className="my-5 font-serif text-md leading-[1.6] text-brand-500">
        “{response.reason}”
      </blockquote>
      <DefinitionList
        items={[
          ['Use when', response.condition],
          ['Warning', response.warning],
          ['Relevant equipment', response.equipment],
          ['When not to use it', response.doNotUse],
        ]}
      />
      <small className="mt-4 block text-sm text-brand-400">
        No message was sent. This is a sample response.
      </small>
    </Card>
  );
}
