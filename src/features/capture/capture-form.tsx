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
import { useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import { identifierPattern, shortText } from '@/lib/domain/validation';
import { draftPath } from './paths';
import {
  maxRecordingSeconds,
  recordingSeconds,
  recordingType,
  rememberRecording,
  useRecorder,
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
  })
  .refine((v) => v.recorded || v.walkthrough.trim(), {
    path: ['walkthrough'],
    message: 'Record or upload audio, or paste a walkthrough.',
  });
type CaptureValues = z.infer<typeof captureSchema>;

async function startDraft({ recording, ...values }: CaptureValues & { recording?: Recording }) {
  const process = await api.createProcess({ title: values.title, equipment: values.equipment });
  if (recording) {
    const target = await api.requestUpload(process.id, {
      kind: 'audio',
      expertReference: values.expertReference,
      contentType: recording.contentType,
      bytes: recording.blob.size,
      durationSeconds: Math.min(Math.ceil(recording.seconds), maxRecordingSeconds),
    });
    rememberRecording(target.uploadId, recording.blob);
    await api.upload(target, recording.blob);
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
  const [fileError, setFileError] = useState<string>();
  const form = useForm<CaptureValues>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      title: '',
      equipment: '',
      expertReference: 'expert_01',
      walkthrough: '',
      recorded: false,
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
  const recorder = useRecorder(applyRecording);
  const notice = fileError ?? (recorder.state.phase === 'error' ? recorder.state.message : '');

  async function chooseFile(file: File) {
    const contentType = recordingType(file.type);
    if (!contentType)
      return setFileError('Choose a WebM or M4A audio recording, or paste the walkthrough.');
    try {
      const seconds = await recordingSeconds(file);
      if (seconds > maxRecordingSeconds)
        return setFileError('Recordings can be up to 10 minutes long.');
      applyRecording({ blob: file, name: file.name, contentType, seconds });
    } catch {
      setFileError('This recording could not be read. Try another file.');
    }
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
                  { ...values, recording: values.recorded ? recording : undefined },
                  { onSuccess: (path) => router.push(path) },
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
                recorder={recorder}
                onFile={(file) => void chooseFile(file)}
                onRemove={() => applyRecording(undefined)}
                onTooLarge={() => setFileError('Choose a recording smaller than 10 MB.')}
              />
              {notice && (
                <Alert variant="warning" className="my-0">
                  {notice}
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
                      ? 'Uploading and transcribing…'
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
