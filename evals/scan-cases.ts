import type { Execution, ProcessStep } from '../src/lib/domain/types';
import type { ProposedFinding } from '../src/lib/application/analysis/toolkit';

export const scanSteps: ProcessStep[] = [
  {
    id: 'step-1',
    sequence: 1,
    action: 'Isolate and bleed the line',
    required: true,
    source: 'baseline',
  },
  {
    id: 'step-2',
    sequence: 2,
    action: 'Replace the valve and gasket',
    required: true,
    source: 'baseline',
  },
  {
    id: 'step-3',
    sequence: 3,
    action: 'Torque flange bolts to 40 Nm',
    required: true,
    source: 'baseline',
  },
  {
    id: 'step-4',
    sequence: 4,
    action: 'Leak test and restore supply',
    required: true,
    source: 'baseline',
  },
];

/** Deterministic pseudo-random so the eval dataset never changes between runs. */
function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}
const variants = {
  planted: [
    'Waited 30s after torquing and re-torqued the flange, gasket had settled',
    'Rechecked bolt torque after a short wait, two bolts had relaxed',
    'Did a second torque pass after 30 seconds',
  ],
  decoy: [
    'Torqued bolts to 40 Nm as per SOP',
    'Followed torque spec, star pattern',
    'Bolts torqued to spec',
  ],
  harmful: [
    'Skipped leak test, customer in a hurry',
    'No leak test, ran out of time',
    'Leak test skipped to save time',
  ],
  noise: [
    'Customer not home first visit',
    'Parking was difficult',
    'Site access delayed by security',
  ],
};
type Kind = keyof typeof variants;
/**
 * 480 jobs over 8 technicians. Baseline callback rate ~12%. The planted practice cuts it to ~3%,
 * the harmful shortcut raises it to ~30%, and the decoy and noise have no effect.
 */
export function scanRecords(): Execution[] {
  const random = rng(42);
  return Array.from({ length: 480 }, (_, i) => {
    const roll = random();
    const kind: Kind | 'none' =
      roll < 0.15
        ? 'planted'
        : roll < 0.3
          ? 'decoy'
          : roll < 0.38
            ? 'harmful'
            : roll < 0.48
              ? 'noise'
              : 'none';
    const callbackRate = kind === 'planted' ? 0.03 : kind === 'harmful' ? 0.3 : 0.12;
    return {
      id: `job-${i}`,
      technicianId: `tech-${Math.floor(random() * 8)}`,
      assetId: `asset-${i}`,
      equipmentModel: 'V-200',
      jobType: 'valve replacement',
      timestamp: new Date(Date.UTC(2026, 0, 1) + i * 4 * 3600_000).toISOString(),
      checklistValues: '',
      partsUsed: '',
      notes: kind === 'none' ? '' : variants[kind][Math.floor(random() * 3)],
      callback: random() < callbackRate,
    };
  });
}

export interface ScanScore {
  plantedFound: boolean;
  plantedOnTorqueStep: boolean;
  harmfulProposed: boolean;
  decoyProposed: boolean;
  pass: boolean;
}
const about = (f: ProposedFinding, words: string[]) =>
  words.some((w) => `${f.title} ${f.practice} ${f.description}`.toLowerCase().includes(w));
export function scoreScan(findings: ProposedFinding[]): ScanScore {
  const planted = findings.find((f) =>
    about(f, ['re-torque', 'retorque', 'second torque', 'recheck', 'wait']),
  );
  const harmfulProposed = findings.some((f) => about(f, ['skip', 'no leak test']));
  const decoyProposed = findings.some(
    (f) => f !== planted && about(f, ['as per sop', 'to spec', 'star pattern']),
  );
  return {
    plantedFound: Boolean(planted),
    plantedOnTorqueStep: planted?.standardStepId === 'step-3',
    harmfulProposed,
    decoyProposed,
    pass:
      Boolean(planted) &&
      planted?.standardStepId === 'step-3' &&
      !harmfulProposed &&
      !decoyProposed,
  };
}
