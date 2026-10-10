'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/page/empty-state';
import { Eyebrow } from '@/components/page/eyebrow';
import { ErrorBanner } from '@/components/page/error-banner';
import { FormActions } from '@/components/page/layouts';
import { Principle } from '@/components/page/principle';
import { QueryState } from '@/components/page/query-state';
import { api } from '@/lib/client/browser';
import type { DraftCapture, ProcessDto } from '@/lib/client/api';
import { useCapture, useWorkspaceMutation } from '@/lib/client/queries';
import { applyClarifications, clarificationTarget } from '@/lib/sop/steps';
import { proseText } from '@/lib/validation';
import { WithDraft } from './draft-steps';
import { draftPath } from './paths';

const sampleAnswers = [
  'Pressure can look stable immediately after replacement, then drift as the assembly settles.',
  'After valve replacement, especially on older valve assemblies.',
];
const answerSchema = z.object({ answer: proseText });

type ClarifyProps = { processId: string; captureId: string; sample: boolean };

export function Clarify(props: ClarifyProps) {
  const capture = useCapture(props.captureId);
  return (
    <WithDraft processId={props.processId}>
      {(draft) => (
        <QueryState query={capture}>
          {(loaded) => (
            <QuestionForm key={loaded.answers.length} {...props} draft={draft} capture={loaded} />
          )}
        </QueryState>
      )}
    </WithDraft>
  );
}

function QuestionForm({
  processId,
  captureId,
  sample,
  draft,
  capture,
}: ClarifyProps & { draft: ProcessDto; capture: DraftCapture }) {
  const router = useRouter();
  const steps = draft.versions[0].steps;
  const index = capture.answers.length;
  const question = capture.questions[index];
  const isLast = index + 1 >= capture.questions.length;
  const form = useForm({ resolver: zodResolver(answerSchema), defaultValues: { answer: '' } });

  const submit = useWorkspaceMutation(async (answer: string) => {
    await api.answerClarification(processId, {
      captureId,
      stepId: clarificationTarget(steps).id,
      question,
      answer,
    });
    if (!isLast) return;
    const answers = [...capture.answers.map((a) => a.answer), answer];
    await api.saveDraft(processId, applyClarifications(steps, answers));
    router.push(draftPath(processId, captureId, 'review', sample));
  });

  if (!question)
    return (
      <EmptyState
        title="Every question is answered."
        description="Review the draft before publishing it as the baseline."
        action={
          <Button asChild>
            <Link href={draftPath(processId, captureId, 'review', sample)}>
              Review the draft
              <ArrowRight size={16} aria-hidden />
            </Link>
          </Button>
        }
      />
    );

  return (
    <div className="mx-auto my-9 max-w-[630px] sm:my-14">
      <ErrorBanner error={submit.error} onDismiss={submit.reset} />
      <Eyebrow>THE KNOW-HOW BETWEEN THE STEPS</Eyebrow>
      <span className="mt-7 block text-xs text-brand-400">
        Question {index + 1} of {capture.questions.length}
      </span>
      <h1 className="mt-4 text-2xl leading-[1.2] tracking-[-1.6px] sm:text-3xl">{question}</h1>
      <p className="mb-7.5 text-lead">
        You know the judgment behind the action. Help the next person understand it.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(({ answer }) => submit.mutate(answer))}>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your explanation</FormLabel>
                <FormControl>
                  <Textarea rows={5} placeholder="In your own words…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {sample && sampleAnswers[index] && (
            <Button
              variant="link"
              className="mt-4"
              onClick={() =>
                form.setValue('answer', sampleAnswers[index], { shouldValidate: true })
              }
            >
              Use sample expert explanation
              <ArrowUpRight size={14} aria-hidden />
            </Button>
          )}
          <FormActions>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Saving…' : isLast ? 'Build SOP draft' : 'Next question'}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </FormActions>
        </form>
      </Form>
      <Principle>Capturing practical knowledge, never judging people.</Principle>
    </div>
  );
}
