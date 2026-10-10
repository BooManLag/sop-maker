import { randomUUID } from 'node:crypto';
import type { Store } from './store';
import type { Actor } from '../server/auth';
import { requireCondition } from '../server/errors';
import type { schemas } from '../server/contracts';
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
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  };
  s.captures.push(capture);
  return capture;
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
    steps: body.steps.map((step, i) => ({ ...step, sequence: i + 1 })),
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
