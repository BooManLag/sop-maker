'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DefinitionList } from '@/components/common/definition-list';
import { ErrorBanner } from '@/components/common/error-banner';
import { PageTitle } from '@/components/common/page-title';
import { QueryState } from '@/components/common/query-state';
import { OutcomeGrid } from '@/features/findings/outcome-grid';
import { api } from '@/lib/client/browser';
import type { TrialDetail as Trial } from '@/lib/client/api';
import { useTrial, useWorkspaceMutation } from '@/lib/client/queries';
import type { Finding, TrialResult } from '@/lib/domain/types';

export function TrialDetail({ trialId }: { trialId: string }) {
  return (
    <QueryState query={useTrial(trialId)}>
      {(trial) =>
        trial.result ? (
          <TrialOutcome trial={trial} finding={trial.finding} result={trial.result} />
        ) : (
          <TrialPlan trial={trial} finding={trial.finding} />
        )
      }
    </QueryState>
  );
}

const panelClass = 'max-w-[850px] [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:tracking-[-0.55px]';

function TrialPlan({ trial, finding }: { trial: Trial; finding: Finding }) {
  const load = useWorkspaceMutation(() => api.loadSampleResult(trial.id));
  return (
    <>
      <ErrorBanner error={load.error} onDismiss={load.reset} />
      <PageTitle
        eyebrow="CONTROLLED TRIAL · SAMPLE SCENARIO"
        title="Your validation plan is ready."
        description="The local demo saves the plan. Field execution and outcome ingestion are not connected."
      />
      <Card className={panelClass}>
        <Badge tone="amber">Demo trial · awaiting results</Badge>
        <h2>{finding.practice}</h2>
        <DefinitionList
          items={[
            ['Equipment', trial.equipment],
            ['Eligible jobs', trial.testGroup],
            ['Required sample', `${trial.requiredPerGroup.toLocaleString()} jobs per group`],
            ['Outcome', trial.primaryOutcome],
          ]}
        />
        <Alert>
          Explore an illustrative completed trial. These results are not measured from live jobs.
        </Alert>
        <Button disabled={load.isPending} onClick={() => load.mutate(undefined)}>
          Load sample trial result
          <ArrowRight size={16} aria-hidden />
        </Button>
      </Card>
    </>
  );
}

function TrialOutcome({
  trial,
  finding,
  result,
}: {
  trial: Trial;
  finding: Finding;
  result: TrialResult;
}) {
  const router = useRouter();
  const propose = useWorkspaceMutation(() => api.proposeChange(trial.id));
  const validated = result.outcome === 'validated';
  return (
    <>
      <ErrorBanner error={propose.error} onDismiss={propose.reset} />
      <PageTitle
        eyebrow="CONTROLLED TRIAL · SAMPLE SCENARIO"
        title="Did it hold up?"
        description="Compare the controlled trial with the historical signal."
      />
      <Card className={panelClass}>
        <Badge>{validated ? 'Validated in sample trial' : 'Did not replicate'}</Badge>
        <h2>{validated ? 'The practice held up.' : 'The practice did not replicate.'}</h2>
        <OutcomeGrid
          className="my-9 max-sm:grid-cols-1"
          outcomes={[
            { label: 'Historical signal', rate: finding.practiceRate, caption: 'callbacks' },
            {
              label: 'Controlled trial',
              rate: result.treatmentRate,
              caption: 'callbacks · sample',
              highlight: true,
            },
            {
              label: 'Control · current SOP',
              rate: result.controlRate,
              caption: 'callbacks · sample',
            },
          ]}
        />
        <Alert>
          Illustrative result only. No statistical significance is asserted. Both groups contain{' '}
          {trial.requiredPerGroup.toLocaleString()} sample jobs.
        </Alert>
        <p className="text-sm">
          A positive trial opens a human review. It does not change the SOP.
        </p>
        {validated && (
          <Button
            className="mt-3"
            disabled={propose.isPending}
            onClick={() =>
              propose.mutate(undefined, {
                onSuccess: (change) => router.push(`/change-requests/${change.id}`),
              })
            }
          >
            Propose SOP update
            <ArrowRight size={16} aria-hidden />
          </Button>
        )}
      </Card>
    </>
  );
}
