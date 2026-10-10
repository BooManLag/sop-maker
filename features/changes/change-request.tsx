'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ReadOnlyField } from '@/components/page/read-only-field';
import { DefinitionList } from '@/components/page/definition-list';
import { ErrorBanner } from '@/components/page/error-banner';
import { ExportButton } from '@/components/page/export-button';
import { PageTitle } from '@/components/page/page-title';
import { QueryState } from '@/components/page/query-state';
import { WithSideRail, sideRailClass } from '@/components/page/layouts';
import { api } from '@/lib/client/browser';
import type { ChangeRequestDetail } from '@/lib/client/api';
import { useChangeRequest, useWorkspaceMutation } from '@/lib/client/queries';
import { proseText } from '@/lib/validation';

const proposalSchema = z.object({ proposedStep: proseText });
type Proposal = z.infer<typeof proposalSchema>;

export function ChangeRequestReview({ changeId }: { changeId: string }) {
  return (
    <QueryState query={useChangeRequest(changeId)}>
      {(change) => <ProposalForm key={change.status} change={change} />}
    </QueryState>
  );
}

function ProposalForm({ change }: { change: ChangeRequestDetail }) {
  const { trial, ...request } = change;
  const { finding, result } = trial;
  const form = useForm<Proposal>({
    resolver: zodResolver(proposalSchema),
    defaultValues: { proposedStep: change.proposedStep },
  });
  const submit = useWorkspaceMutation(({ proposedStep }: Proposal) =>
    api.submitChange(change.id, proposedStep),
  );
  const proposedStep = useWatch({ control: form.control, name: 'proposedStep' });
  const isDraft = change.status === 'draft';

  return (
    <>
      <ErrorBanner error={submit.error} onDismiss={submit.reset} />
      <PageTitle
        eyebrow="SOP VERSION 2 · PROPOSED, NOT PUBLISHED"
        title="A better standard, for human review."
        description="Bring the practice, the evidence, and the rationale together."
        action={
          <ExportButton
            data={{ ...request, proposedStep, result }}
            fileName="sop-change-request.json"
          />
        }
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            submit.mutate(values, {
              onSuccess: () =>
                toast.success('Submitted for human review. Baseline SOP remains unchanged.'),
            }),
          )}
        >
          <WithSideRail>
            <Card className="grid gap-6">
              <ReadOnlyField label="Current step" value={change.currentStep} rows={2} />
              <FormField
                control={form.control}
                name="proposedStep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed change</FormLabel>
                    <FormControl>
                      <Textarea rows={3} disabled={!isDraft} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ReadOnlyField label="Expert rationale" value={change.rationale} rows={3} />
              <DefinitionList
                items={[
                  [
                    'Supporting evidence',
                    `${finding.title} · ${finding.evidence.sampleSize} comparable sample jobs · ${finding.technicians} technicians`,
                  ],
                  [
                    'Trial result',
                    result
                      ? `${result.treatmentRate}% versus ${result.controlRate}% callbacks · illustrative controlled trial`
                      : 'Awaiting trial result',
                  ],
                  ['Audit references', `${change.findingId} · ${change.trialId}`],
                ]}
              />
            </Card>
            <Card className={`${sideRailClass} md:sticky md:top-6`}>
              <Badge tone={isDraft ? 'amber' : 'green'}>
                {isDraft ? 'Draft change request' : 'Submitted for review'}
              </Badge>
              <h3>Approval belongs to your organization.</h3>
              <p>
                Good Exception does not change your SOP automatically. Final approval belongs to
                your organization.
              </p>
              <Button type="submit" disabled={submit.isPending || !isDraft}>
                {isDraft ? 'Submit for approval' : 'Submitted for approval'}
                <ArrowRight size={15} aria-hidden />
              </Button>
              <small>
                Demo review queue. No notification is sent. Version 1 remains the published
                standard.
              </small>
            </Card>
          </WithSideRail>
        </form>
      </Form>
    </>
  );
}
