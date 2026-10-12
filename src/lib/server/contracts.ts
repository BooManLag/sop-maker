import { z } from 'zod';
import { LIMITS } from './config';
import { ApiError } from './errors';
import type { Permission } from './auth';
import { idSchema, proseText as prose, shortText as short } from '../domain/validation';
export { idSchema };
const optionalProse = z.string().trim().max(2000).optional();
export const stepSchema = z
  .object({
    id: idSchema,
    sequence: z.number().int().min(1).max(LIMITS.steps),
    action: short,
    required: z.boolean(),
    condition: optionalProse,
    rationale: optionalProse,
    warning: optionalProse,
    evidence: optionalProse,
    durationMinSeconds: z.number().int().min(0).max(86400).optional(),
    durationMaxSeconds: z.number().int().min(0).max(86400).optional(),
    source: z.enum(['expert_walkthrough', 'baseline', 'validated_field_practice']),
    evidenceLinks: z.array(idSchema).max(20).optional(),
  })
  .strict()
  .superRefine((step, context) => {
    if (
      step.durationMinSeconds !== undefined &&
      step.durationMaxSeconds !== undefined &&
      step.durationMinSeconds > step.durationMaxSeconds
    )
      context.addIssue({
        code: 'custom',
        message: 'Minimum duration cannot exceed maximum duration.',
      });
  });
const cell = z.union([z.string().max(2000), z.number().finite(), z.boolean()]);
export const rowSchema = z
  .object({
    job_id: z.string().trim().min(1).max(128),
    technician_id: cell.optional(),
    asset_id: cell.optional(),
    equipment_model: cell.optional(),
    job_type: cell.optional(),
    timestamp: cell.optional(),
    checklist_values: cell.optional(),
    parts_used: cell.optional(),
    notes: cell.optional(),
    callback_within_30_days: cell.optional(),
  })
  .strict();
export const extractionSchema = z
  .object({
    steps: z
      .array(stepSchema.safeExtend({ source: z.literal('expert_walkthrough') }))
      .min(1)
      .max(LIMITS.steps),
    questions: z.array(z.string().trim().min(1).max(500)).min(1).max(3),
  })
  .strict()
  .superRefine((output, ctx) => {
    if (new Set(output.steps.map((s) => s.id)).size !== output.steps.length)
      ctx.addIssue({ code: 'custom', message: 'Step identifiers must be unique.' });
    if (output.steps.some((s, i) => s.sequence !== i + 1))
      ctx.addIssue({ code: 'custom', message: 'Step sequences must be contiguous.' });
  });
const empty = z.object({}).strict();
const uniqueSteps = z
  .array(stepSchema)
  .min(1)
  .max(LIMITS.steps)
  .refine((steps) => new Set(steps.map((s) => s.id)).size === steps.length, {
    message: 'Step IDs must be unique.',
  });
export const schemas = {
  workspace: empty,
  processList: empty,
  findingList: empty,
  trialList: empty,
  changeList: empty,
  auditList: empty,
  processCreate: z.object({ title: short, equipment: short }).strict(),
  processGet: empty,
  captureGet: empty,
  captureCreate: z
    .object({
      kind: z.enum(['text', 'video', 'audio', 'document']),
      expertReference: idSchema,
      text: z.string().max(LIMITS.captureCharacters).optional(),
      fileName: z.string().max(255).optional(),
    })
    .strict(),
  captureAnalyze: z.object({ captureId: idSchema, sample: z.boolean().default(false) }).strict(),
  clarificationCreate: z
    .object({
      captureId: idSchema,
      stepId: idSchema,
      question: z.string().trim().min(1).max(500),
      answer: prose,
    })
    .strict(),
  processDraftSave: z.object({ steps: uniqueSteps }).strict(),
  processPublish: z
    .object({
      approved: z.literal(true, { error: 'Explicit human approval is required.' }),
      steps: uniqueSteps,
    })
    .strict(),
  scanCreate: z
    .object({
      processId: idSchema,
      demo: z.boolean().default(false),
      rows: z.array(rowSchema).max(LIMITS.rows).optional(),
    })
    .strict()
    .refine((v) => v.demo || !!v.rows?.length, {
      message: 'Upload records or explicitly choose the sample.',
    }),
  scanGet: empty,
  scanReadiness: empty,
  scanRun: empty,
  scanFindings: empty,
  findingGet: empty,
  findingDismiss: empty,
  findingRestore: empty,
  findingExplain: empty,
  trialCreate: z.object({ findingId: idSchema, equipment: short, testGroup: prose }).strict(),
  trialGet: empty,
  trialResults: z.object({ sample: z.literal(true) }).strict(),
  changeCreate: z.object({ trialId: idSchema }).strict(),
  changeGet: empty,
  changeSubmit: z.object({ proposedStep: prose }).strict(),
  retention: empty,
} satisfies Record<string, z.ZodType>;
export type Operation = keyof typeof schemas;
export interface Endpoint {
  operation: Operation;
  method: 'GET' | 'POST';
  path: string;
  permission: Permission;
  create?: boolean;
}
export const endpoints: Endpoint[] = [
  { operation: 'workspace', method: 'GET', path: 'workspace', permission: 'read' },
  { operation: 'processList', method: 'GET', path: 'processes', permission: 'read' },
  {
    operation: 'processCreate',
    method: 'POST',
    path: 'processes',
    permission: 'write',
    create: true,
  },
  { operation: 'processGet', method: 'GET', path: 'processes/:id', permission: 'read' },
  {
    operation: 'captureCreate',
    method: 'POST',
    path: 'processes/:id/captures',
    permission: 'write',
    create: true,
  },
  { operation: 'captureGet', method: 'GET', path: 'captures/:id', permission: 'read' },
  {
    operation: 'captureAnalyze',
    method: 'POST',
    path: 'processes/:id/analyze-capture',
    permission: 'write',
  },
  {
    operation: 'clarificationCreate',
    method: 'POST',
    path: 'processes/:id/clarifications',
    permission: 'write',
    create: true,
  },
  {
    operation: 'processDraftSave',
    method: 'POST',
    path: 'processes/:id/draft',
    permission: 'write',
  },
  {
    operation: 'processPublish',
    method: 'POST',
    path: 'processes/:id/publish',
    permission: 'review',
  },
  { operation: 'scanCreate', method: 'POST', path: 'scans', permission: 'write', create: true },
  { operation: 'scanGet', method: 'GET', path: 'scans/:id', permission: 'read' },
  { operation: 'scanReadiness', method: 'POST', path: 'scans/:id/readiness', permission: 'write' },
  { operation: 'scanRun', method: 'POST', path: 'scans/:id/run', permission: 'write' },
  { operation: 'scanFindings', method: 'GET', path: 'scans/:id/findings', permission: 'read' },
  { operation: 'findingList', method: 'GET', path: 'findings', permission: 'read' },
  { operation: 'findingGet', method: 'GET', path: 'findings/:id', permission: 'read' },
  {
    operation: 'findingDismiss',
    method: 'POST',
    path: 'findings/:id/dismiss',
    permission: 'review',
  },
  {
    operation: 'findingRestore',
    method: 'POST',
    path: 'findings/:id/restore',
    permission: 'review',
  },
  {
    operation: 'findingExplain',
    method: 'POST',
    path: 'findings/:id/request-explanation',
    permission: 'write',
  },
  { operation: 'trialList', method: 'GET', path: 'trials', permission: 'read' },
  { operation: 'trialCreate', method: 'POST', path: 'trials', permission: 'review', create: true },
  { operation: 'trialGet', method: 'GET', path: 'trials/:id', permission: 'read' },
  { operation: 'trialResults', method: 'POST', path: 'trials/:id/results', permission: 'review' },
  { operation: 'changeList', method: 'GET', path: 'change-requests', permission: 'read' },
  {
    operation: 'changeCreate',
    method: 'POST',
    path: 'change-requests',
    permission: 'review',
    create: true,
  },
  { operation: 'changeGet', method: 'GET', path: 'change-requests/:id', permission: 'read' },
  {
    operation: 'changeSubmit',
    method: 'POST',
    path: 'change-requests/:id/submit',
    permission: 'review',
  },
  { operation: 'auditList', method: 'GET', path: 'audit-events', permission: 'admin' },
  { operation: 'retention', method: 'POST', path: 'maintenance/retention', permission: 'admin' },
];
export const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z
      .string()
      .regex(/^\d{1,5}$/)
      .default('0'),
    sort: z.enum(['asc', 'desc']).default('asc'),
    status: z
      .string()
      .regex(/^[a-z_]{1,32}$/)
      .optional(),
  })
  .strict();
export type ListQuery = z.infer<typeof querySchema>;
export function resolveEndpoint(method: string, segments: string[]) {
  const parts = segments[0] === 'v1' ? segments.slice(1) : segments;
  if (parts.length > 3 || parts.some((p) => !idSchema.safeParse(p).success))
    throw new ApiError(404, 'Endpoint not found.');
  const matches = endpoints.filter((e) => {
    const p = e.path.split('/');
    return p.length === parts.length && p.every((s, i) => s === ':id' || s === parts[i]);
  });
  const endpoint = matches.find((e) => e.method === method);
  if (!endpoint)
    throw new ApiError(
      matches.length ? 405 : 404,
      matches.length ? 'HTTP method is not supported for this endpoint.' : 'Endpoint not found.',
    );
  return { endpoint, id: endpoint.path.includes(':id') ? parts[1] : undefined };
}
export function parseInput<T extends Operation>(
  operation: T,
  value: unknown,
): z.infer<(typeof schemas)[T]> {
  const result = schemas[operation].safeParse(value);
  if (!result.success)
    throw new ApiError(
      400,
      `Invalid request: ${result.error.issues
        .slice(0, 3)
        .map((x) => `${x.path.join('.') || 'body'}: ${x.message}`)
        .join('; ')}`,
    );
  return result.data as z.infer<(typeof schemas)[T]>;
}
