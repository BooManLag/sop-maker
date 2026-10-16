/**
 * Generates deterministic manufacturing dummy data under test-data/manufacturing/.
 * Run with `npm run testdata:generate`; the output is committed, so reruns only show a diff
 * when this file changes.
 *
 * Every record is fictional. In these files `callback_within_30_days` means "rework, scrap or
 * return within 30 days": the column keeps its name because the importer requires it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { evaluatePractice } from '../src/lib/application/analysis/stats';
import { EvidenceEngine, normalizeRecords } from '../src/lib/application/evidence-engine';

const outDir = join(import.meta.dirname, '..', 'test-data', 'manufacturing');

function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

type Row = Record<(typeof columns)[number], string>;
const columns = [
  'job_id',
  'technician_id',
  'asset_id',
  'equipment_model',
  'job_type',
  'timestamp',
  'checklist_values',
  'parts_used',
  'notes',
  'callback_within_30_days',
] as const;

interface Scenario {
  file: string;
  seed: number;
  prefix: string;
  jobs: number;
  technicians: string[];
  models: { name: string; assets: string[]; partsUsed: string }[];
  jobType: string;
  checklist: string[];
  /** The expert's habit; recorded in notes by whoever follows it. */
  practice: string[];
  /** A shortcut that quietly raises rework. */
  harmful: string[];
  standard: string[];
  noise: string[];
  /** Callback probabilities. */
  rates: { base: number; practice: number; harmful: number };
  /** Share of technicians who ever use the practice, and the share of their later jobs that do. */
  adopters: number;
  start: string;
  end: string;
}

const scenarios: Scenario[] = [
  {
    file: 'cnc-spindle-bearing-replacement.csv',
    seed: 11,
    prefix: 'CNC',
    jobs: 520,
    technicians: Array.from({ length: 8 }, (_, i) => `mt-${String(i + 1).padStart(3, '0')}`),
    models: [
      {
        name: 'Haas VF-2',
        assets: ['VF2-014', 'VF2-015', 'VF2-021', 'VF2-022'],
        partsUsed: 'angular contact bearing set P4',
      },
      {
        name: 'DMG Mori NLX 2500',
        assets: ['NLX-003', 'NLX-007', 'NLX-008'],
        partsUsed: 'spindle bearing kit SB-25',
      },
    ],
    jobType: 'spindle bearing replacement',
    checklist: ['lockout_applied', 'preload_set', 'runout_within_5um', 'coolant_seals_checked'],
    practice: [
      'Ran 10 minute spindle warm-up at 50 percent speed then re-measured runout',
      'Warm-up cycle before final runout check, runout drifted 2 microns and was re-shimmed',
      'Let spindle thermally settle with a warm-up run and rechecked preload',
    ],
    harmful: [
      'Skipped final runout check, machine needed back on the floor',
      'No runout re-measure, shift lead wanted it released',
    ],
    standard: [
      'Bearings replaced per SOP, runout checked once',
      'Preload set to spec, runout in tolerance',
      'Routine bearing swap, no issues',
    ],
    noise: [
      'Waited for crane to lift spindle cartridge',
      'Coolant tank was low, topped up',
      'Operator reported chatter before job started',
    ],
    rates: { base: 0.12, practice: 0.025, harmful: 0.26 },
    adopters: 0.7,
    start: '2026-03-02',
    end: '2026-09-04',
  },
  {
    file: 'injection-mold-changeover.csv',
    seed: 27,
    prefix: 'MLD',
    jobs: 460,
    technicians: Array.from({ length: 7 }, (_, i) => `sf-${String(i + 1).padStart(3, '0')}`),
    models: [
      {
        name: 'Engel e-victory 120',
        assets: ['EV120-01', 'EV120-02', 'EV120-05'],
        partsUsed: 'mold clamps, new O-ring set',
      },
      {
        name: 'Arburg Allrounder 470',
        assets: ['ALR470-02', 'ALR470-04'],
        partsUsed: 'mold clamps, hot runner seals',
      },
    ],
    jobType: 'mold changeover',
    checklist: ['mold_temp_reached', 'clamp_torque_verified', 'dry_cycle_run', 'first_article_ok'],
    practice: [
      'Purged barrel and ran 5 scrap shots before first article, measured critical dimensions twice',
      'Second dimensional check after cooling 3 minutes, flash found and corrected before release',
      'Ran short dry cycle at low clamp pressure first, then full tonnage',
    ],
    harmful: [
      'Skipped dry cycle to save changeover time',
      'Released first article without cooling check, rush order',
    ],
    standard: [
      'Mold swapped, first article passed',
      'Standard changeover, hot runner heated to setpoint',
      'Clamp torque verified, parts in spec',
    ],
    noise: [
      'Waiting on resin dryer to reach dew point',
      'Forklift not available for mold cart',
      'Material lot changed during changeover',
    ],
    rates: { base: 0.12, practice: 0.03, harmful: 0.26 },
    adopters: 0.6,
    start: '2026-03-09',
    end: '2026-09-03',
  },
  {
    file: 'robot-weld-torch-service.csv',
    seed: 37,
    prefix: 'WLD',
    jobs: 210,
    technicians: Array.from({ length: 9 }, (_, i) => `mt-${String(i + 101)}`),
    models: [
      {
        name: 'Fanuc ARC Mate 100iD',
        assets: ['ARC-A1', 'ARC-A2', 'ARC-B1', 'ARC-B3'],
        partsUsed: 'contact tip 1.0mm, liner, nozzle',
      },
      {
        name: 'Yaskawa AR1440',
        assets: ['AR-C2', 'AR-C4'],
        partsUsed: 'contact tip 1.2mm, liner, diffuser',
      },
    ],
    jobType: 'torch contact tip and liner replacement',
    checklist: ['gas_flow_checked', 'wire_tension_set', 'tcp_verified', 'test_bead_ok'],
    practice: [
      'Verified wire feed tension with gauge and ran a test bead on coupon before releasing the cell',
      'Re-taught tool center point after liner swap and welded a coupon',
      'Checked gas flow at the torch end with flowmeter and ran a coupon bead',
    ],
    harmful: [
      'Did not check TCP after torch change, production waiting',
      'Skipped test bead, cell was behind schedule',
    ],
    standard: [
      'Tip and liner replaced per checklist',
      'Torch serviced, gas flow set to spec',
      'Routine contact tip swap',
    ],
    noise: [
      'Spatter build-up was heavier than usual',
      'Anti-spatter spray bottle empty',
      'Fixture clamp needed adjustment before job',
    ],
    rates: { base: 0.09, practice: 0.09, harmful: 0.24 },
    adopters: 0.65,
    start: '2026-03-16',
    end: '2026-09-07',
  },
  {
    // Deliberately small: the practice shows promise but does not reach the strong threshold.
    file: 'smt-stencil-printer-service-small.csv',
    seed: 46,
    prefix: 'SMT',
    jobs: 72,
    technicians: Array.from({ length: 4 }, (_, i) => `pe-${String(i + 1).padStart(3, '0')}`),
    models: [
      { name: 'DEK Horizon 03iX', assets: ['PRT-01', 'PRT-02'], partsUsed: 'squeegee blade set' },
      { name: 'Yamaha YSP', assets: ['PRT-03'], partsUsed: 'squeegee blade set, vacuum filter' },
    ],
    jobType: 'stencil printer cleaning and calibration',
    checklist: ['stencil_wiped', 'vision_calibrated', 'paste_age_checked'],
    practice: [
      'Inspected paste deposits on first 3 boards with SPI before releasing the lot',
      'Ran SPI on the first three boards and adjusted print pressure',
    ],
    harmful: ['Released lot without SPI check, line starved of boards'],
    standard: ['Printer cleaned and calibrated per SOP', 'Vision calibration passed'],
    noise: ['Paste jar was close to expiry, swapped for fresh', 'Underside wipe roll replaced'],
    rates: { base: 0.2, practice: 0.06, harmful: 0.3 },
    adopters: 0.6,
    start: '2026-05-04',
    end: '2026-08-28',
  },
];

function buildRows(s: Scenario): Row[] {
  const rand = rng(s.seed);
  const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
  const startMs = Date.parse(`${s.start}T00:00:00Z`);
  const spanMs = Date.parse(`${s.end}T00:00:00Z`) - startMs;
  // Adopters start at a different point, so each has both before and after jobs.
  const adoptsFrom = new Map(
    s.technicians.map((t) => [t, rand() < s.adopters ? 0.15 + rand() * 0.45 : 2] as const),
  );
  const stamps = Array.from({ length: s.jobs }, () => startMs + rand() * spanMs).sort(
    (a, b) => a - b,
  );
  const rows = stamps.map((ms, i) => {
    const date = new Date(ms);
    // Shop-floor hours on weekdays.
    while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(6 + Math.floor(rand() * 10), Math.floor(rand() / 0.25) * 15, 0, 0);
    const tech = pick(s.technicians);
    const model = pick(s.models);
    const progress = (ms - startMs) / spanMs;
    const adopted = progress >= (adoptsFrom.get(tech) ?? 2) && rand() < 0.6;
    const cutCorner = !adopted && rand() < 0.08;
    const kind = adopted ? 'practice' : cutCorner ? 'harmful' : 'standard';
    const probability =
      kind === 'practice' ? s.rates.practice : kind === 'harmful' ? s.rates.harmful : s.rates.base;
    const note = rand() < 0.18 ? pick(s.noise) : pick(s[kind]);
    const missingCheck = kind === 'harmful' ? s.checklist.length - 1 : -1;
    const checklist = s.checklist
      .map((item, n) => `${item}:${n === missingCheck ? 'false' : 'true'}`)
      .join(';');
    return {
      job_id: `${s.prefix}-${String(i + 1).padStart(4, '0')}`,
      technician_id: tech,
      asset_id: pick(model.assets),
      equipment_model: model.name,
      job_type: s.jobType,
      timestamp: date.toISOString().replace('.000', ''),
      checklist_values: checklist,
      parts_used: model.partsUsed,
      notes: note,
      callback_within_30_days: rand() < probability ? 'true' : 'false',
    };
  });
  // Hours were drawn after sorting by day, so put the final timestamps in order and renumber.
  return rows
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((r, i) => ({ ...r, job_id: `${s.prefix}-${String(i + 1).padStart(4, '0')}` }));
}

const csvCell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const toCsv = (rows: Row[], header: readonly string[] = columns) =>
  [
    header.join(','),
    ...rows.map((r) => header.map((c) => csvCell(r[c as keyof Row] ?? '')).join(',')),
  ].join('\n') + '\n';

mkdirSync(join(outDir, 'walkthroughs'), { recursive: true });
const engine = new EvidenceEngine();
const summary: string[] = [];
const built = new Map<string, Row[]>();

for (const scenario of scenarios) {
  const rows = buildRows(scenario);
  built.set(scenario.file, rows);
  writeFileSync(join(outDir, scenario.file), toCsv(rows));
  const records = normalizeRecords(rows as unknown as Record<string, unknown>[]);
  const { eligible } = engine.readiness(records);
  const practiceIds = new Set(
    rows.filter((r) => scenario.practice.includes(r.notes)).map((r) => r.job_id),
  );
  const evalResult = evaluatePractice(records, practiceIds);
  const callbacks = rows.filter((r) => r.callback_within_30_days === 'true').length;
  summary.push(
    `${scenario.file}: ${rows.length} rows, ${callbacks} callbacks, ready=${eligible}, practice jobs=${evalResult.jobs} ` +
      `(${evalResult.technicians} techs), ${evalResult.practiceRate}% vs ${evalResult.baselineRate}% z=${evalResult.discovery.z} => ${evalResult.grade ?? 'none'} (${evalResult.reason})`,
  );
}

// An Excel copy of the first dataset, for the XLSX import path.
const cnc = built.get(scenarios[0].file)!;
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(cnc, { header: [...columns] }),
  'Service records',
);
writeFileSync(
  join(outDir, 'cnc-spindle-bearing-replacement.xlsx'),
  XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
);

// Negative cases: each is expected to fail readiness for a different reason.
const tooFew = cnc.slice(0, 14);
writeFileSync(join(outDir, 'insufficient-records.csv'), toCsv(tooFew));

const messy = cnc.slice(0, 60).map((r) => ({ ...r }));
messy.forEach((r, i) => {
  if (i % 7 === 0) r.callback_within_30_days = '';
  if (i % 5 === 0) r.technician_id = '';
  if (i % 3 === 0) r.checklist_values = '';
  if (i % 11 === 0) r.timestamp = 'last tuesday';
  if (i === 4)
    r.notes = 'Called Dana at dana.ortiz@example.com or +1 555 014 2299 about the spare spindle';
  if (i === 9) r.equipment_model = '';
});
writeFileSync(join(outDir, 'messy-records.csv'), toCsv(messy));

summary.push(`insufficient-records.csv: ${tooFew.length} rows`);
summary.push(
  `messy-records.csv: ready=${engine.readiness(normalizeRecords(messy as unknown as Record<string, unknown>[])).eligible}`,
);

// Walkthroughs for "Create first SOP" (one numbered step per line; the demo parser splits on sentences).
const walkthroughs: Record<string, string[]> = {
  'cnc-spindle-bearing-replacement': [
    'Apply lockout and tagout to the machine and bleed the drawbar air',
    'Remove the spindle cartridge with the crane and mount it on the bearing stand',
    'Press off the worn bearings and clean the shaft journals',
    'Fit the new angular contact bearing set and set the preload to specification',
    'Reinstall the cartridge and reconnect coolant and lubrication lines',
    'Measure spindle runout at the taper and confirm it is within 5 microns',
    'Record runout and close the work order',
  ],
  'injection-mold-changeover': [
    'Stop the press and confirm the previous lot is cleared',
    'Cool the old mold and disconnect water and hot runner lines',
    'Lift out the old mold and clean the platen faces',
    'Mount the new mold and torque the clamps to specification',
    'Reconnect water and heat the hot runner to setpoint',
    'Run a dry cycle at low clamp pressure',
    'Mold the first article and measure the critical dimensions',
    'Release the lot and record the changeover time',
  ],
  'robot-weld-torch-service': [
    'Park the robot and apply lockout to the welding power source',
    'Remove the nozzle, contact tip and liner',
    'Fit the new liner, contact tip and nozzle',
    'Set the wire feed tension and check shielding gas flow',
    'Verify the tool center point against the reference pin',
    'Run a test bead on a coupon and inspect it',
    'Release the cell and log the consumables used',
  ],
  'smt-stencil-printer-service': [
    'Stop the line and remove the stencil',
    'Clean the stencil and wipe the underside',
    'Replace the squeegee blades and vacuum filter',
    'Refit the stencil and run vision calibration',
    'Load fresh solder paste and note its expiry',
    'Print a test board and check alignment',
    'Release the lot and record the service',
  ],
};
for (const [name, steps] of Object.entries(walkthroughs))
  writeFileSync(
    join(outDir, 'walkthroughs', `${name}.txt`),
    steps.map((step, i) => `${i + 1}. ${step}`).join('\n') + '\n',
  );

console.log(summary.join('\n'));
