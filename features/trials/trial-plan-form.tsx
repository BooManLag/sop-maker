'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
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
import { ReadOnlyField } from '@/components/page/read-only-field';
import { ErrorBanner } from '@/components/page/error-banner';
import { QueryState } from '@/components/page/query-state';
import { WithSideRail, sideRailClass } from '@/components/page/layouts';
import { api } from '@/lib/client/browser';
import { useFinding, useWorkspaceMutation } from '@/lib/client/queries';
import { trialPrimaryOutcome, type Finding } from '@/lib/domain';
import { proseText, shortText } from '@/lib/validation';

const planSchema = z.object({ equipment: shortText, testGroup: proseText });
type PlanValues = z.infer<typeof planSchema>;

export function TrialPlanForm({ findingId }: { findingId: string }) {
  return <QueryState query={useFinding(findingId)}>{(f) => <PlanForm finding={f} />}</QueryState>;
}

function PlanForm({ finding }: { finding: Finding }) {
  const router = useRouter();
  const form = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      equipment: 'Valve assembly X',
      testGroup: 'Eligible valve replacement jobs on assembly X',
    },
  });
  const create = useWorkspaceMutation((values: PlanValues) =>
    api.createTrial({ findingId: finding.id, ...values }),
  );

  return (
    <>
      <ErrorBanner error={create.error} onDismiss={create.reset} />
      <WithSideRail>
        <Card>
          <Form {...form}>
            <form
              className="grid gap-6"
              onSubmit={form.handleSubmit((values) =>
                create.mutate(values, { onSuccess: (trial) => router.push(`/trials/${trial.id}`) }),
              )}
            >
              <ReadOnlyField label="Practice" value={finding.practice} />
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ReadOnlyField label="Primary outcome" value={trialPrimaryOutcome} />
              <FormField
                control={form.control}
                name="testGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test group</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ReadOnlyField label="Control" value={`Current SOP — ${finding.standard}`} />
              <Alert className="my-0">
                This creates a demo trial plan. No field jobs are assigned, and no live trial is
                started.
              </Alert>
              <div>
                <Button type="submit" disabled={create.isPending}>
                  Start demo validation
                  <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            </form>
          </Form>
        </Card>
        <Card tone="sample" className={sideRailClass}>
          <FlaskConical size={28} aria-hidden className="text-brand-400" />
          <h3>Plan for enough evidence.</h3>
          <p>
            Sample size is calculated on the server using a two-proportion approximation:{' '}
            {finding.baselineRate}% versus {finding.practiceRate}%, two-sided 5% significance and
            80% power.
          </p>
          <p>
            Allow the full 30-day outcome window. A real trial also needs random allocation, safety
            review, and an approved analysis plan.
          </p>
          <small>This estimate is for planning. It is not proof of an effect.</small>
        </Card>
      </WithSideRail>
    </>
  );
}
