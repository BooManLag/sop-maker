'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowUpRight, Check, FileText, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eyebrow } from '@/components/common/eyebrow';
import { ErrorBanner } from '@/components/common/error-banner';
import { UploadArea, megabytes } from '@/components/common/upload-area';
import { FormActions, TwoFields, WithSideRail, sideRailClass } from '@/components/common/layouts';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/client/browser';
import { useWorkspaceMutation } from '@/lib/client/queries';
import { identifierPattern, shortText } from '@/lib/domain/validation';
import { draftPath } from './paths';

const sampleWalkthrough =
  'Sample expert walkthrough: isolate supply, replace valve, test pressure, wait 3–5 minutes, test again, close job.';

const captureSchema = z
  .object({
    title: shortText,
    equipment: shortText,
    expertReference: z
      .string()
      .regex(identifierPattern, 'Use letters, digits, hyphens or underscores only.'),
    walkthrough: z.string().max(20_000),
    sample: z.boolean(),
  })
  .refine((v) => v.sample || v.walkthrough.trim(), {
    path: ['walkthrough'],
    message: 'Paste a walkthrough or choose the sample.',
  });
type CaptureValues = z.infer<typeof captureSchema>;

async function startDraft(values: CaptureValues) {
  const process = await api.createProcess({ title: values.title, equipment: values.equipment });
  const capture = await api.createCapture(process.id, {
    kind: 'text',
    expertReference: values.expertReference,
    text: values.sample ? sampleWalkthrough : values.walkthrough,
  });
  await api.analyzeCapture(process.id, { captureId: capture.id, sample: values.sample });
  return draftPath(process.id, capture.id, 'steps', values.sample);
}

export function CaptureForm() {
  const router = useRouter();
  const [mediaFile, setMediaFile] = useState<string>();
  const form = useForm<CaptureValues>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      title: '',
      equipment: 'Valve assembly X',
      expertReference: 'expert_01',
      walkthrough: '',
      sample: false,
    },
  });
  const analyze = useWorkspaceMutation(startDraft);
  const sample = useWatch({ control: form.control, name: 'sample' });

  function chooseSample() {
    form.setValue('title', 'Valve Replacement', { shouldValidate: true });
    form.setValue('walkthrough', sampleWalkthrough);
    form.setValue('sample', true);
    setMediaFile(undefined);
  }

  return (
    <>
      <ErrorBanner error={analyze.error} onDismiss={analyze.reset} />
      <WithSideRail>
        <Card>
          <Form {...form}>
            <form
              className="grid gap-6"
              onSubmit={form.handleSubmit((values) =>
                analyze.mutate(values, { onSuccess: (path) => router.push(path) }),
              )}
            >
              <TwoFields>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Valve Replacement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment / job type</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TwoFields>
              <FormField
                control={form.control}
                name="expertReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expert reference</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Use an anonymized reference whenever possible.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <UploadArea
                title={mediaFile ?? 'Add an expert walkthrough'}
                hint="Video, audio, document, or checklist · up to 20 MB"
                accept="video/*,audio/*,.pdf,.txt,.docx"
                limit={{
                  bytes: megabytes(20),
                  onExceeded: () =>
                    form.setError('walkthrough', {
                      message: 'Please choose a file smaller than 20 MB.',
                    }),
                }}
                onFile={(file) => {
                  setMediaFile(file.name);
                  form.setValue('sample', false);
                }}
              />
              {mediaFile && (
                <Alert className="my-0">
                  Media extraction is not connected yet. Choose the sample below to explore the
                  flow, or paste your walkthrough.
                </Alert>
              )}

              <FormField
                control={form.control}
                name="walkthrough"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Or paste a walkthrough</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Walk through the task, including checks, waits, and decisions…"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue('sample', false);
                          setMediaFile(undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormActions>
                <Button type="submit" disabled={analyze.isPending}>
                  {analyze.isPending ? 'Preparing draft…' : 'Analyze walkthrough'}
                  <ArrowRight size={16} aria-hidden />
                </Button>
              </FormActions>
            </form>
          </Form>
        </Card>

        <aside className={sideRailClass}>
          <Card tone="sample">
            <Eyebrow>TRY THE COMPLETE LOOP</Eyebrow>
            <FileText size={29} aria-hidden className="mt-6 text-brand-400" />
            <h3 className="text-xl! leading-[1.3]">
              Valve replacement,
              <br />
              from the field.
            </h3>
            <p>
              An expert replaces a valve, waits for pressure to settle, and checks it again.
              Let&apos;s capture the why.
            </p>
            <Button variant="secondary" onClick={chooseSample}>
              Use sample walkthrough
              <ArrowUpRight size={15} aria-hidden />
            </Button>
            {sample && (
              <small className="flex! items-center gap-2 text-xs! text-brand-600!">
                <Check size={14} aria-hidden />
                Sample selected
              </small>
            )}
          </Card>
          <p className="mt-5.5 flex gap-2.5 text-xs! leading-[1.7] text-brand-400">
            <ShieldCheck size={18} aria-hidden className="mt-1 shrink-0" />
            Nothing is published until a person reviews and approves it.
          </p>
          <p className="text-xs! text-brand-400">
            Demo extraction adapter. Real Gemini processing is not connected.
          </p>
        </aside>
      </WithSideRail>
    </>
  );
}
