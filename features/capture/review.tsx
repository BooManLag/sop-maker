'use client';

import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/page/error-banner';
import { ExportButton } from '@/components/page/export-button';
import { PageTitle } from '@/components/page/page-title';
import { TwoFields, WithSideRail, sideRailClass } from '@/components/page/layouts';
import { StepRow } from '@/features/processes/step-view';
import { api } from '@/lib/client/browser';
import type { ProcessDto } from '@/lib/client/api';
import { useWorkspaceMutation } from '@/lib/client/queries';
import type { ProcessStep } from '@/lib/domain';
import { shortText } from '@/lib/validation';
import { WithDraft } from './draft-steps';

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
  approved: z.boolean().refine(Boolean, 'Approve the procedure before publishing it.'),
});
type ReviewInput = z.input<typeof reviewSchema>;
type ReviewValues = z.output<typeof reviewSchema>;
type DetailField = 'condition' | 'rationale' | 'warning' | 'evidence';

const blankToUndefined = (text: string) => text || undefined;

/** Merges reviewed text back into the draft steps; blank details are cleared. */
function reviewedSteps(steps: ProcessStep[], values: ReviewValues): ProcessStep[] {
  return steps.map((step, i) => {
    const reviewed = values.steps[i];
    return {
      ...step,
      action: reviewed.action,
      condition: blankToUndefined(reviewed.condition),
      rationale: blankToUndefined(reviewed.rationale),
      warning: blankToUndefined(reviewed.warning),
      evidence: blankToUndefined(reviewed.evidence),
    };
  });
}

export function Review({ processId }: { processId: string }) {
  return <WithDraft processId={processId}>{(draft) => <ReviewForm draft={draft} />}</WithDraft>;
}

function ReviewForm({ draft }: { draft: ProcessDto }) {
  const router = useRouter();
  const steps = draft.versions[0].steps;
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
      approved: false,
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: 'steps' });
  const publish = useWorkspaceMutation((values: ReviewValues) =>
    api.publish(draft.id, reviewedSteps(steps, values)),
  );

  return (
    <>
      <ErrorBanner error={publish.error} onDismiss={publish.reset} />
      <PageTitle
        eyebrow="DRAFT V1 · HUMAN REVIEW"
        title={draft.title}
        description="A useful standard includes what to do, when to do it, and why."
        action={<ExportButton data={{ ...draft, steps }} fileName="sop-draft.json" />}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            publish.mutate(values, {
              onSuccess: () => router.push(`/processes/${draft.id}/published`),
            }),
          )}
        >
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
                  </div>
                </StepRow>
              ))}
            </Card>
            <Card className={`${sideRailClass} md:sticky md:top-6`}>
              <Badge tone="amber">Awaiting approval</Badge>
              <h3>Make it the baseline.</h3>
              <p>Review the steps, safety requirements, and expert rationale before publishing.</p>
              <FormField
                control={form.control}
                name="approved"
                render={({ field }) => (
                  <FormItem className="my-5.5">
                    <div className="flex items-start gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel className="text-xs leading-[1.7] font-normal text-brand-500">
                        I have reviewed this procedure and approve it as the baseline SOP.
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={publish.isPending}>
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
