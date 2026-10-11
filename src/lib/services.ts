import { createHash, createHmac } from 'node:crypto';
import { ApiError } from './server/errors';
import type { Execution, ProcessStep, Readiness } from './domain/types';
import { captureSteps } from './domain/demo-data';
export interface CaptureAdapter {
  extract(
    text: string,
    sample: boolean,
    options?: { signal: AbortSignal; maxOutputTokens: number },
  ): Promise<ProcessStep[]>;
  questions(steps: ProcessStep[]): Promise<string[]>;
}
export class DemoGeminiAdapter implements CaptureAdapter {
  async extract(text: string, sample: boolean) {
    if (sample)
      return structuredClone(captureSteps).map((s) => ({
        ...s,
        source: 'expert_walkthrough' as const,
      }));
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\d+[.)]\s*/, ''))
      .flatMap((line) => line.split(/\.(?:\s|$)/))
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error('Add a walkthrough or choose the sample.');
    return lines.map((action, i) => ({
      id: `step-${i + 1}`,
      sequence: i + 1,
      action,
      required: true,
      source: 'expert_walkthrough' as const,
    }));
  }
  async questions(steps: ProcessStep[]) {
    const judgment = steps.find((s) => /wait|repeat/i.test(s.action));
    return judgment
      ? [
          `You included “${judgment.action}”. Why is that useful?`,
          'When should this practice be used?',
        ]
      : [
          'What judgment or safety check should someone know before following these steps?',
          'When does the procedure need to change?',
        ];
  }
}
export interface AnalyticsService {
  readiness(records: Execution[]): Readiness;
  analyze(records: Execution[]): Promise<never>;
}
export class EvidenceEngine implements AnalyticsService {
  readiness(records: Execution[]): Readiness {
    const known = records.filter((r) => r.callback !== null);
    const history = records.filter((r) => r.technicianId);
    const checklists = records.filter((r) => r.checklistValues);
    const missing: string[] = [];
    if (records.length < 30)
      missing.push('At least 30 service records are needed for initial data review.');
    if (known.length !== records.length)
      missing.push('Every job needs a valid, fully observed 30-day callback outcome.');
    if (history.length !== records.length)
      missing.push('Technician references are needed for within-technician comparisons.');
    if (checklists.length < records.length * 0.8)
      missing.push('Checklist values are needed for at least 80% of jobs.');
    if (records.some((r) => !r.equipmentModel || !r.jobType))
      missing.push('Equipment model and job type are required for comparable groups.');
    return {
      eligible: missing.length === 0,
      count: records.length,
      categories: [
        {
          label: 'Callback linkage',
          value: known.length === records.length && records.length ? 'Strong' : 'Limited',
        },
        {
          label: 'Technician history',
          value: history.length === records.length && records.length ? 'Strong' : 'Limited',
        },
        {
          label: 'Checklist coverage',
          value: checklists.length >= records.length * 0.8 && records.length ? 'Good' : 'Limited',
        },
        {
          label: 'Free-text notes',
          value: records.filter((r) => r.notes).length > records.length * 0.5 ? 'Good' : 'Limited',
        },
        { label: 'Exact step sequence', value: 'Unavailable' },
      ],
      can: ['Recorded checklist differences', 'Recorded parts substitutions'],
      cannot: [
        'Physical actions that were never recorded',
        'Exact sequence without step timestamps',
        'Causal effects from historical correlation alone',
      ],
      missing,
    };
  }
  async analyze(_records: Execution[]): Promise<never> {
    throw new Error(
      'Live evidence analysis is not connected. Imported records can be checked for readiness; findings are available only in the labeled sample scenario.',
    );
  }
}
export function normalizeRecords(
  rows: Record<string, unknown>[],
  privacy?: { organizationId: string; key?: string },
): Execution[] {
  const pseudonym = (value: string) =>
    privacy?.key
      ? createHmac('sha256', privacy.key)
          .update(`${privacy.organizationId}\0${value}`)
          .digest('hex')
          .slice(0, 24)
      : createHash('sha256')
          .update(`${privacy?.organizationId ?? 'demo-org'}\0${value}`)
          .digest('hex')
          .slice(0, 12);
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const val = (key: string) => String(r[key] ?? '').trim();
    const id = val('job_id');
    if (!id) throw new Error(`Row ${i + 2}: job_id is required.`);
    if (seen.has(id)) throw new ApiError(400, 'Duplicate job_id in imported records.');
    seen.add(id);
    const raw = val('callback_within_30_days').toLowerCase();
    return {
      id,
      technicianId: val('technician_id') ? `tech_${pseudonym(val('technician_id'))}` : '',
      assetId: val('asset_id'),
      equipmentModel: val('equipment_model'),
      jobType: val('job_type'),
      timestamp: val('timestamp'),
      checklistValues: val('checklist_values'),
      partsUsed: val('parts_used'),
      notes: val('notes')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
        .replace(/\b(?:\+?\d[ .()-]?){8,15}\b/g, '[phone removed]'),
      callback: ['true', '1', 'yes'].includes(raw)
        ? true
        : ['false', '0', 'no'].includes(raw)
          ? false
          : null,
    };
  });
}
export function requiredSamplePerGroup(
  baseline = 0.062,
  target = 0.041,
  alphaZ = 1.96,
  powerZ = 0.84,
) {
  const average = (baseline + target) / 2;
  return Math.ceil(
    (alphaZ * Math.sqrt(2 * average * (1 - average)) +
      powerZ * Math.sqrt(baseline * (1 - baseline) + target * (1 - target))) **
      2 /
      (baseline - target) ** 2,
  );
}
