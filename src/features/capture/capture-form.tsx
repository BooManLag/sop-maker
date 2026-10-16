'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorBanner } from '@/components/common/error-banner';
import { RecordingInput } from './recording-input';
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
import { putWithProgress } from '@/lib/client/upload';
import { useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import { identifierPattern, shortText } from '@/lib/domain/validation';
import { draftPath } from './paths';
import {
  formatMegabytes,
  maxMediaBytes,
  recordingType,
  rememberRecording,
  type Recording,
} from './recording';

const captureSchema = z
  .object({
    title: shortText,
    equipment: shortText,
    expertReference: z
      .string()
      .regex(identifierPattern, 'Use letters, digits, hyphens or underscores only.'),
    walkthrough: z.string().max(20_000),
    recorded: z.boolean(),
    consent: z.boolean(),
  })
  .refine((v) => v.recorded || v.walkthrough.trim(), {
    path: ['walkthrough'],
    message: 'Upload a recording, or paste a walkthrough.',
  })
  .refine((v) => !v.recorded || v.consent, {
    path: ['consent'],
    message: 'Confirm that everyone in the recording agreed to be recorded.',
  });
type CaptureValues = z.infer<typeof captureSchema>;
type DraftRequest = CaptureValues & {
  recording?: Recording;
  onProgress: (fraction: number) => void;
};

async function startDraft({ recording, onProgress, ...values }: DraftRequest) {
  const process = await api.createProcess({ title: values.title, equipment: values.equipment });
  if (recording) {
    const target = await api.requestUpload(process.id, {
      expertReference: values.expertReference,
      contentType: recording.contentType,
      bytes: recording.file.size,
      consent: true,
    });
    rememberRecording(target.uploadId, recording);
    await putWithProgress(target, recording.file, onProgress);
    await api.completeUpload(target.uploadId);
    return draftPath(process.id, target.uploadId, 'transcript');
  }
  const capture = await api.createCapture(process.id, {
    kind: 'text',
    expertReference: values.expertReference,
    text: values.walkthrough,
  });
  await api.analyzeCapture(process.id, { captureId: capture.id });
  return draftPath(process.id, capture.id, 'steps');
}

export function CaptureForm() {
  const router = useRouter();
  const [recording, setRecording] = useState<Recording>();
  const [progress, setProgress] = useState<number>();
  const [fileError, setFileError] = useState<string>();
  const form = useForm<CaptureValues>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      title: '',
      equipment: '',
      expertReference: 'expert_01',
      walkthrough: '',
      recorded: false,
      consent: false,
    },
  });
  const analyze = useWorkspaceMutation(startDraft);
  const demo = useWorkspace().data?.demo;

  function applyRecording(next?: Recording) {
    setRecording(next);
    setFileError(undefined);
    form.setValue('recorded', !!next);
    if (next) {
      form.setValue('walkthrough', '');
      form.clearErrors('walkthrough');
    }
  }

  function chooseFile(file: File) {
    const contentType = recordingType(file);
    if (!contentType)
      return setFileError(
        'Choose an MP4 or WebM video, or WebM or M4A audio, or paste the walkthrough.',
      );
    applyRecording({ file, contentType });
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
                analyze.mutate(
                  {
                    ...values,
                    recording: values.recorded ? recording : undefined,
                    onProgress: setProgress,
                  },
                  {
                    onSuccess: (path) => router.push(path),
                    onSettled: () => setProgress(undefined),
                  },
                ),
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
                        <Input placeholder="e.g. Valve assembly X" {...field} />
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

              <RecordingInput
                recording={recording}
                progress={progress}
                onFile={chooseFile}
                onRemove={() => applyRecording(undefined)}
                onTooLarge={() =>
                  setFileError(`Choose a recording smaller than ${formatMegabytes(maxMediaBytes)}.`)
                }
              />
              {fileError && (
                <Alert variant="warning" className="my-0">
                  {fileError}
                </Alert>
              )}
              {recording && (
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <FormLabel className="text-xs leading-[1.7] font-normal text-brand-500">
                          Everyone who can be seen or heard in this recording agreed to be recorded.
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          if (recording) applyRecording(undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormActions>
                <Button type="submit" disabled={analyze.isPending}>
                  {analyze.isPending
                    ? recording
                      ? progress !== undefined && progress < 1
                        ? 'Uploading…'
                        : 'Transcribing…'
                      : 'Preparing draft…'
                    : recording
                      ? 'Transcribe recording'
                      : 'Analyze walkthrough'}
                  <ArrowRight size={16} aria-hidden />
                </Button>
              </FormActions>
            </form>
          </Form>
        </Card>

        <aside className={sideRailClass}>
          <p className="mt-5.5 flex gap-2.5 text-xs! leading-[1.7] text-brand-400">
            <ShieldCheck size={18} aria-hidden className="mt-1 shrink-0" />
            Nothing is published until a person reviews and approves it.
          </p>
          {demo && (
            <p className="text-xs! text-brand-400">
              Demo extraction and transcription. Recordings stay on this computer and receive a
              sample transcript; real Gemini and speech processing are not connected.
            </p>
          )}
        </aside>
      </WithSideRail>
    </>
  );
}
