import { randomUUID } from 'node:crypto';
import type { Store } from './store';
/** Raw capture content (walkthrough text, recordings, transcripts) expires after 30 days. */
const rawContentRetentionMs = 30 * 86400_000;
import { isVideo, type ExpertCapture, type ProcessStep } from '../domain/types';
import type { Actor } from '../server/auth';
import { requireCondition } from '../server/errors';
import { transcriptionSchema, type schemas } from '../server/contracts';
import type { z } from 'zod';
type Input<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;
export function getProcess(s: Store, id?: string) {
  const process = s.processes.find((p) => p.id === id);
  requireCondition(process, 'Process not found.', 404);
  return process;
}
export function requireDraft(process: ReturnType<typeof getProcess>) {
  requireCondition(
    process.currentVersion === 0,
    'Baseline is already published; changes go through a change request.',
    409,
  );
}
export function createProcess(s: Store, body: Input<'processCreate'>, actor: Actor) {
  const id = randomUUID();
  const process = {
    id,
    organizationId: actor.organizationId,
    title: body.title,
    equipment: body.equipment,
    currentVersion: 0,
    versions: [
      {
        id: randomUUID(),
        processId: id,
        version: 1,
        status: 'draft' as const,
        title: body.title,
        steps: [],
        createdAt: new Date().toISOString(),
      },
    ],
  };
  s.processes.push(process);
  return process;
}
export function createCapture(s: Store, id: string, body: Input<'captureCreate'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  requireCondition(
    body.kind === 'text',
    'Binary media upload and extraction are not connected. Paste a walkthrough instead.',
    422,
  );
  requireCondition(!!body.text?.trim(), 'Walkthrough text is required.');
  const capture = {
    id: randomUUID(),
    processId: p.id,
    ...body,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + rawContentRetentionMs).toISOString(),
  };
  s.captures.push(capture);
  return capture;
}
export function createMediaCapture(
  s: Store,
  id: string,
  upload: { uploadId: string; objectPath: string },
  body: Input<'uploadRequest'>,
  actor: Actor,
) {
  const p = getProcess(s, id);
  requireDraft(p);
  const now = new Date();
  s.captures.push({
    id: upload.uploadId,
    processId: p.id,
    kind: isVideo(body.contentType) ? 'video' : 'audio',
    expertReference: body.expertReference,
    media: { objectPath: upload.objectPath, contentType: body.contentType },
    consent: { confirmedBy: actor.userId, confirmedAt: now.toISOString() },
    status: 'awaiting_upload',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + rawContentRetentionMs).toISOString(),
  });
}
/** The inspected recording length; zero until the media worker has read it. */
export const recordingMs = (capture: ExpertCapture) =>
  Math.ceil((capture.media?.seconds ?? 0) * 1000);
export function getFrameStep(s: Store, id: string, body: Input<'frameRequest'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  const capture = s.captures.find((c) => c.id === body.captureId && c.processId === p.id);
  requireCondition(capture?.media, 'Recording not found.', 404);
  requireCondition(body.atMs <= recordingMs(capture), 'The frame time is outside the recording.');
  const step = p.versions[0].steps.find((step) => step.id === body.stepId);
  requireCondition(step, 'Step not found.', 404);
  return step;
}
/** The expert's corrections replace the transcript; draft steps are left to the step editor. */
export function saveTranscript(s: Store, id: string, body: Input<'transcriptSave'>) {
  const capture = getCapture(s, id);
  requireDraft(getProcess(s, capture.processId));
  requireCondition(
    capture.media && capture.status === 'transcribed',
    'Only a finished transcription can be edited.',
    409,
  );
  const segments = transcriptionSchema(recordingMs(capture)).shape.segments.safeParse(
    body.segments,
  );
  requireCondition(
    segments.success,
    'Transcript times must stay inside the recording, in order and without overlaps.',
  );
  capture.segments = segments.data;
}
export function createClarification(s: Store, id: string, body: Input<'clarificationCreate'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  requireCondition(
    s.captures.some((c) => c.id === body.captureId && c.processId === p.id),
    'Capture not found.',
    404,
  );
  requireCondition(
    p.versions[0].steps.some((step) => step.id === body.stepId),
    'Step does not belong to this process.',
    404,
  );
  const existing = s.clarifications.find(
    (c) =>
      c.captureId === body.captureId && c.stepId === body.stepId && c.question === body.question,
  );
  if (existing) {
    requireCondition(
      existing.answer === body.answer,
      'A different answer already exists for this question.',
      409,
    );
    return existing;
  }
  const result = { id: randomUUID(), ...body };
  s.clarifications.push(result);
  return result;
}
/** Frame objects are linked only by `frameRequest`; client-sent paths are discarded. */
function withServerFrames(current: ProcessStep[], incoming: ProcessStep[]): ProcessStep[] {
  const frames = new Map(current.map((step) => [step.id, step.frameObjectPath]));
  return incoming.map(({ frameObjectPath: _, ...step }, i) => {
    const frameObjectPath = frames.get(step.id);
    return { ...step, sequence: i + 1, ...(frameObjectPath ? { frameObjectPath } : {}) };
  });
}
export function saveDraftSteps(s: Store, id: string, body: Input<'processDraftSave'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  p.versions[0].steps = withServerFrames(p.versions[0].steps, body.steps);
  return p;
}
export function publishProcess(s: Store, id: string, body: Input<'processPublish'>, actor: Actor) {
  const p = getProcess(s, id);
  requireCondition(body.approved, 'Explicit human approval is required.');
  requireDraft(p);
  requireCondition(
    body.steps.every((step) => step.source !== 'validated_field_practice'),
    'Baseline publication cannot claim controlled-trial validation.',
  );
  p.versions[0] = {
    ...p.versions[0],
    steps: withServerFrames(p.versions[0].steps, body.steps),
    status: 'published',
    approvedBy: actor.userId,
  };
  p.currentVersion = 1;
  return p;
}
export function processDto(process: ReturnType<typeof getProcess>) {
  return {
    id: process.id,
    title: process.title,
    equipment: process.equipment,
    currentVersion: process.currentVersion,
    versions: process.versions.map(({ approvedBy, ...version }) => ({
      ...version,
      approved: !!approvedBy,
    })),
  };
}
export function getCapture(s: Store, id?: string) {
  const capture = s.captures.find((c) => c.id === id);
  requireCondition(capture, 'Capture not found.', 404);
  return capture;
}
export function captureDraftDto(s: Store, id?: string) {
  const capture = getCapture(s, id);
  return {
    id: capture.id,
    processId: capture.processId,
    kind: capture.kind,
    ...(capture.consent ? { consent: capture.consent } : {}),
    ...(capture.status
      ? {
          status: capture.status,
          segments: capture.segments ?? [],
          durationMs: recordingMs(capture),
          ...(capture.rejection ? { rejection: capture.rejection } : {}),
        }
      : {}),
    questions: capture.questions ?? [],
    answers: s.clarifications
      .filter((c) => c.captureId === capture.id)
      .map(({ question, answer }) => ({ question, answer })),
  };
}
