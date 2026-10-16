'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/common/error-banner';
import { SopExportButton } from '@/features/processes/sop-export-button';
import { PageTitle } from '@/components/common/page-title';
import { TwoFields, WithSideRail, sideRailClass } from '@/components/common/layouts';
import { StepRow } from '@/features/processes/step-view';
import { StepStill, useStepStills } from '@/features/processes/step-still';
import { api } from '@/lib/client/browser';
import type { ProcessDto } from '@/lib/client/api';
import { useWorkspaceMutation } from '@/lib/client/queries';
import { stepsMissingPictures, withReviewedText } from '@/lib/domain/steps';
import { shortText } from '@/lib/domain/validation';
import { WithDraft } from './draft-steps';
import { draftPath } from './paths';

const optionalDetail = z.string().trim().max(2000);
const reviewSchema = z.object({
  steps: z.array(
    z.object({
      action: shortText,
      condition: optionalDetail,
      rationale: optionalDetail,
      warning: optionalDetail,
      evidence: optionalDetail,
    }),
  ),
});
type ReviewInput = z.input<typeof reviewSchema>;
type ReviewValues = z.output<typeof reviewSchema>;
type DetailField = 'condition' | 'rationale' | 'warning' | 'evidence';

export function Review({ processId, captureId }: { processId: string; captureId: string }) {
  return (
    <WithDraft processId={processId}>
      {(draft) => <ReviewForm draft={draft} captureId={captureId} />}
    </WithDraft>
  );
}

function ReviewForm({ draft, captureId }: { draft: ProcessDto; captureId: string }) {
  const router = useRouter();
  const steps = draft.versions[0].steps;
  // The server refuses the same steps; listing them here saves a failed publish.
  const missing = stepsMissingPictures(steps);
  const stills = useStepStills(draft.id, steps);
  const form = useForm<ReviewInput, unknown, ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      steps: steps.map((s) => ({
        action: s.action,
        condition: s.condition ?? '',
        rationale: s.rationale ?? '',
        warning: s.warning ?? '',
        evidence: s.evidence ?? '',
      })),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'steps' });
  const publish = useWorkspaceMutation(
    (values: ReviewValues) => api.publish(draft.id, withReviewedText(steps, values.steps)),
    () => router.push(`/processes/${draft.id}/published`),
  );

  return (
    <>
      <ErrorBanner error={publish.error} onDismiss={publish.reset} />
      <PageTitle
        eyebrow="DRAFT V1 · HUMAN REVIEW"
        title={draft.title}
        description="A useful standard includes what to do, when to do it, and why."
        action={
          <SopExportButton
            process={draft}
            steps={steps}
            data={{ ...draft, steps }}
            fileName="sop-draft.json"
          />
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => publish.mutate(values))}>
          <WithSideRail>
            <Card>
              {fields.map((field, i) => (
                <StepRow key={field.id} number={i + 1}>
                  <div className="grid flex-1 gap-3 [&_[data-slot=form-item]]:text-tiny [&_input]:p-2 [&_input]:text-xs">
                    <DetailInput control={form.control} index={i} name="action" label="Action" />
                    <TwoFields>
                      <DetailInput
                        control={form.control}
                        index={i}
                        name="condition"
                        label="Use when"
                        placeholder="Conditions"
                      />
                      <DetailInput
                        control={form.control}
                        index={i}
                        name="rationale"
                        label="Why"
                        placeholder="Rationale"
                      />
                    </TwoFields>
                    <TwoFields>
                      <DetailInput
                        control={form.control}
                        index={i}
                        name="warning"
                        label="Warning"
                        placeholder="Safety judgment"
                      />
                      <DetailInput
                        control={form.control}
                        index={i}
                        name="evidence"
                        label="Completion evidence"
                        placeholder="Expected result"
                      />
                    </TwoFields>
                    <StepStill url={stills[steps[i].id]} label={`step ${i + 1}`} />
                  </div>
                </StepRow>
              ))}
            </Card>
            <Card className={`${sideRailClass} md:sticky md:top-6`}>
              {missing.length ? (
                <>
                  <Badge tone="amber">Pictures needed</Badge>
                  <h3>Every step needs a picture.</h3>
                  <p>
                    Step {missing.map((s) => s.sequence).join(', ')}{' '}
                    {missing.length === 1 ? 'has' : 'have'} no picture. Add one, or mark the step as
                    needing none.
                  </p>
                  <Button variant="secondary" asChild>
                    <Link href={draftPath(draft.id, captureId, 'steps')}>Back to steps</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Badge tone="amber">Ready to publish</Badge>
                  <h3>Make it the baseline.</h3>
                  <p>
                    Review the steps, safety requirements, and expert rationale before publishing.
                  </p>
                </>
              )}
              <Button
                type="submit"
                className="mt-5.5"
                disabled={publish.isPending || missing.length > 0}
              >
                {publish.isPending ? 'Publishing…' : 'Publish baseline SOP'}
                <Check size={16} aria-hidden />
              </Button>
              <small>Creates Version 1 in this demo workspace.</small>
            </Card>
          </WithSideRail>
        </form>
      </Form>
    </>
  );
}

function DetailInput({
  control,
  index,
  name,
  label,
  placeholder,
}: {
  control: Control<ReviewInput, unknown, ReviewValues>;
  index: number;
  name: 'action' | DetailField;
  label: string;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={`steps.${index}.${name}`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
