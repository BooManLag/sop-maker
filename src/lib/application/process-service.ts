import { randomUUID } from 'node:crypto';
import type { Store } from './store';
/** Raw capture content (walkthrough text, recordings, transcripts) expires after 30 days. */
const rawContentRetentionMs = 30 * 86400_000;
import {
  isVideo,
  type ExpertCapture,
  type MediaContentType,
  type ProcessStep,
} from '../domain/types';
import type { Actor } from '../server/auth';
import { requireCondition } from '../server/errors';
import { transcriptionSchema, type schemas } from '../server/contracts';
import type { z } from 'zod';
import { missingPicturesMessage, stepsMissingPictures } from '../domain/steps';
type Input<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;
export function getProcess(s: Store, id?: string) {
  const process = s.processes.find((p) => p.id === id);
  requireCondition(process, 'Process not found.', 404);
  return process;
}
/** Archived processes keep their history but take no new work. */
export function requireActive(process: ReturnType<typeof getProcess>) {
  requireCondition(!process.archivedAt, 'This process is archived.', 409);
}
/** Processes that still appear in lists. */
export const activeProcesses = (s: Store) => s.processes.filter((p) => !p.archivedAt);
export function requireDraft(process: ReturnType<typeof getProcess>) {
  requireActive(process);
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
/** Renames a process; published versions keep the title they were approved under. */
export function updateProcess(s: Store, id: string, body: Input<'processUpdate'>) {
  const p = getProcess(s, id);
  requireActive(p);
  if (body.title !== undefined) p.title = body.title;
  if (body.equipment !== undefined) p.equipment = body.equipment;
  if (p.currentVersion === 0 && body.title !== undefined) p.versions[0].title = body.title;
  return p;
}
/**
 * Deletes a draft with everything captured for it; its recordings expire with draft storage.
 * A published process, or one evidence points at, is archived so its history survives.
 */
export function deleteProcess(s: Store, id: string) {
  const p = getProcess(s, id);
  const referenced =
    s.scans.some((x) => x.processId === id) ||
    s.findings.some((x) => x.processId === id) ||
    s.changes.some((x) => x.processId === id);
  if (p.currentVersion > 0 || referenced) {
    p.archivedAt ??= new Date().toISOString();
    return { id, outcome: 'archived' as const };
  }
  const captureIds = new Set(s.captures.filter((c) => c.processId === id).map((c) => c.id));
  s.clarifications = s.clarifications.filter((c) => !captureIds.has(c.captureId));
  s.captures = s.captures.filter((c) => c.processId !== id);
  s.processes = s.processes.filter((x) => x.id !== id);
  return { id, outcome: 'deleted' as const };
}
/**
 * Permanently deletes a process, published or not, with every record that points at it: captures,
 * clarifications, scans, findings and their trials, results and responses, and change requests.
 * The caller must type the current title to confirm. Returns the stored media to remove once the
 * deletion commits.
 */
export function purgeProcess(s: Store, id: string, body: Input<'processPurge'>) {
  const p = getProcess(s, id);
  requireCondition(body.title === p.title, 'Type the process title exactly to confirm.', 400);
  const captures = s.captures.filter((c) => c.processId === id);
  const captureIds = new Set(captures.map((c) => c.id));
  const findingIds = new Set(s.findings.filter((f) => f.processId === id).map((f) => f.id));
  const trialIds = new Set(s.trials.filter((t) => findingIds.has(t.findingId)).map((t) => t.id));
  const media = [
    ...p.versions.flatMap((v) => v.steps.flatMap((step) => step.frameObjectPath ?? [])),
    ...captures.flatMap((c) => (c.media ? [c.media.objectPath, c.media.cleanPath ?? []] : [])),
  ].flat();
  s.clarifications = s.clarifications.filter((c) => !captureIds.has(c.captureId));
  s.captures = s.captures.filter((c) => c.processId !== id);
  s.scans = s.scans.filter((x) => x.processId !== id);
  s.changes = s.changes.filter((x) => x.processId !== id && !trialIds.has(x.trialId));
  s.results = s.results.filter((r) => !trialIds.has(r.trialId));
  s.trials = s.trials.filter((t) => !trialIds.has(t.id));
  s.responses = s.responses.filter((r) => !findingIds.has(r.findingId));
  s.findings = s.findings.filter((f) => f.processId !== id);
  s.processes = s.processes.filter((x) => x.id !== id);
  return { result: { id, outcome: 'deleted' as const }, media: [...new Set(media)] };
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
export const recordingLengthMs = (capture: ExpertCapture) =>
  Math.ceil((capture.media?.seconds ?? 0) * 1000);
export function getFrameStep(s: Store, id: string, body: Input<'frameRequest'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  const capture = s.captures.find((c) => c.id === body.captureId && c.processId === p.id);
  requireCondition(capture, 'Capture not found.', 404);
  // A photo for a text walkthrough has no moment in a recording to point at.
  requireCondition(
    capture.media ? body.atMs <= recordingLengthMs(capture) : body.atMs === 0,
    'The frame time is outside the recording.',
  );
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
  const segments = transcriptionSchema(recordingLengthMs(capture)).shape.segments.safeParse(
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
/**
 * Images enter a draft only through `frameRequest`. A save may keep, move or drop the draft's own
 * images; any other object path a client sends is discarded.
 */
function withServerFrames(current: ProcessStep[], incoming: ProcessStep[]): ProcessStep[] {
  const draftImages = new Set(current.flatMap((step) => step.frameObjectPath ?? []));
  return incoming.map(({ frameObjectPath, ...step }, i) => ({
    ...step,
    sequence: i + 1,
    ...(frameObjectPath && draftImages.has(frameObjectPath) ? { frameObjectPath } : {}),
  }));
}
/** Points a step at the kept copy of its image; an image changed since copying stops publication. */
function withKeptFrame(step: ProcessStep, keptFrames: Map<string, string>): ProcessStep {
  if (!step.frameObjectPath) return step;
  const kept = keptFrames.get(step.frameObjectPath);
  requireCondition(kept, 'A step image changed while publishing. Publish again.', 409);
  return { ...step, frameObjectPath: kept };
}
export function saveDraftSteps(s: Store, id: string, body: Input<'processDraftSave'>) {
  const p = getProcess(s, id);
  requireDraft(p);
  p.versions[0].steps = withServerFrames(p.versions[0].steps, body.steps);
  return p;
}
export function publishProcess(
  s: Store,
  id: string,
  body: Input<'processPublish'>,
  actor: Actor,
  /** Each draft image path mapped to its kept copy, from `keepFrames`. */
  keptFrames: Map<string, string>,
) {
  const p = getProcess(s, id);
  requireDraft(p);
  requireCondition(
    body.steps.every((step) => step.source !== 'validated_field_practice'),
    'Baseline publication cannot claim controlled-trial validation.',
  );
  const steps = withServerFrames(p.versions[0].steps, body.steps);
  const missing = stepsMissingPictures(steps);
  requireCondition(!missing.length, missingPicturesMessage(missing), 409);
  p.versions[0] = {
    ...p.versions[0],
    steps: steps.map((step) => withKeptFrame(step, keptFrames)),
    status: 'published',
    approvedBy: actor.userId,
  };
  p.currentVersion = 1;
  return p;
}
/** A transcribed recording's checked copy in storage. */
export interface StoredRecording {
  captureId: string;
  objectPath: string;
  contentType: MediaContentType;
}
type CleanRecording = ExpertCapture & {
  media: NonNullable<ExpertCapture['media']> & { cleanPath: string };
};
const isUsableRecording =
  (processId: string) =>
  (c: ExpertCapture): c is CleanRecording =>
    c.processId === processId &&
    c.status === 'transcribed' &&
    !!c.media?.cleanPath &&
    (!c.expiresAt || Date.parse(c.expiresAt) > Date.now());
/** Objects behind a process's step images and, while it is a draft, its latest recording. */
export function mediaObjects(s: Store, id: string) {
  const p = getProcess(s, id);
  const draft = p.versions[0];
  const frames = draft.steps.flatMap((step) =>
    step.frameObjectPath ? [{ stepId: step.id, objectPath: step.frameObjectPath }] : [],
  );
  const recording =
    p.currentVersion === 0 ? s.captures.findLast(isUsableRecording(p.id)) : undefined;
  const video: StoredRecording | undefined = recording && {
    captureId: recording.id,
    objectPath: recording.media.cleanPath,
    contentType: recording.media.contentType,
  };
  return { version: draft.version, frames, video };
}
export function processDto(process: ReturnType<typeof getProcess>) {
  return {
    id: process.id,
    title: process.title,
    equipment: process.equipment,
    currentVersion: process.currentVersion,
    ...(process.archivedAt ? { archivedAt: process.archivedAt } : {}),
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
          durationMs: recordingLengthMs(capture),
          ...(capture.rejection ? { rejection: capture.rejection } : {}),
        }
      : {}),
    questions: capture.questions ?? [],
    answers: s.clarifications
      .filter((c) => c.captureId === capture.id)
      .map(({ question, answer }) => ({ question, answer })),
  };
}
