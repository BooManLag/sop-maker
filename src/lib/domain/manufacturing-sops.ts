import type { Clarification, ExpertCapture, Finding, Process, ProcessStep } from './types';

/**
 * Fictional manufacturing SOP library for test runs. It is loaded only on request
 * (`npm run seed:manufacturing`), so the default valve-replacement scenario stays unchanged.
 */
type StepDetail = Partial<
  Pick<
    ProcessStep,
    'condition' | 'rationale' | 'warning' | 'evidence' | 'durationMinSeconds' | 'durationMaxSeconds'
  >
>;
type StepInput = string | [action: string, detail: StepDetail];

const organizationId = 'demo-org';
const approver = 'demo-reviewer';

function steps(source: ProcessStep['source'], inputs: StepInput[]): ProcessStep[] {
  return inputs.map((input, i) => {
    const [action, detail] = typeof input === 'string' ? [input, {}] : input;
    return { id: `step-${i + 1}`, sequence: i + 1, action, required: true, source, ...detail };
  });
}

function published(
  id: string,
  title: string,
  equipment: string,
  createdAt: string,
  inputs: StepInput[],
): Process {
  return {
    id,
    organizationId,
    title,
    equipment,
    currentVersion: 1,
    versions: [
      {
        id: `${id}-v1`,
        processId: id,
        version: 1,
        status: 'published',
        title,
        steps: steps('baseline', inputs),
        createdAt,
        approvedBy: approver,
      },
    ],
  };
}

function draft(
  id: string,
  title: string,
  equipment: string,
  createdAt: string,
  inputs: StepInput[],
): Process {
  return {
    id,
    organizationId,
    title,
    equipment,
    currentVersion: 0,
    versions: [
      {
        id: `${id}-v1`,
        processId: id,
        version: 1,
        status: 'draft',
        title,
        steps: steps('expert_walkthrough', inputs),
        createdAt,
      },
    ],
  };
}

const lockout =
  'Follow the plant lockout and tagout procedure. Verify zero energy before reaching in.';

export const manufacturingProcesses: Process[] = [
  published(
    'spindle-bearing-replacement',
    'Spindle Bearing Replacement',
    'Haas VF-2',
    '2026-02-16T08:00:00Z',
    [
      ['Apply lockout and tagout to the machine and bleed the drawbar air', { warning: lockout }],
      'Remove the tool holder and disconnect coolant and lubrication lines',
      [
        'Lift the spindle cartridge with the crane and mount it on the bearing stand',
        {
          warning:
            'The cartridge weighs about 45 kg. Use the rated lifting eye and keep clear of the load.',
        },
      ],
      'Press off the worn bearings and clean the shaft journals',
      [
        'Fit the new angular contact bearing set in the marked orientation',
        {
          rationale: 'Reversed bearings carry the load on the wrong face and fail early.',
          evidence: 'Photo of the bearing marks before pressing.',
        },
      ],
      [
        'Set the preload to specification',
        {
          rationale:
            'Too little preload lets the spindle chatter and too much overheats the bearings.',
          evidence: 'Record the preload value.',
        },
      ],
      'Reinstall the cartridge and reconnect coolant and lubrication lines',
      [
        'Measure spindle runout at the taper and confirm it is within 5 microns',
        {
          evidence: 'Record the runout reading.',
          rationale: 'Runout above tolerance leaves chatter marks and shortens tool life.',
        },
      ],
      'Record the readings and close the work order',
    ],
  ),
  published(
    'injection-mold-changeover',
    'Injection Mold Changeover',
    'Engel e-victory 120',
    '2026-02-23T08:00:00Z',
    [
      'Stop the press and confirm the previous lot is cleared and labelled',
      [
        'Cool the old mold and disconnect water and hot runner lines',
        {
          warning: 'Hot runner manifolds stay hot after shutdown. Wear heat-resistant gloves.',
          durationMinSeconds: 600,
          durationMaxSeconds: 1200,
        },
      ],
      [
        'Lift out the old mold and clean the platen faces',
        { warning: 'Check the lifting eye rating against the mold weight before lifting.' },
      ],
      [
        'Mount the new mold and torque the clamps to specification',
        { evidence: 'Record the clamp torque.' },
      ],
      'Reconnect water lines and heat the hot runner to setpoint',
      [
        'Run a dry cycle at low clamp pressure',
        {
          rationale: 'Catches ejector or slide collisions before full tonnage is applied.',
        },
      ],
      [
        'Mold the first article and measure the critical dimensions',
        { evidence: 'Record the critical dimensions and pass/fail result.' },
      ],
      'Release the lot and record the changeover time',
    ],
  ),
  published(
    'robot-weld-torch-service',
    'Robotic Weld Torch Service',
    'Fanuc ARC Mate 100iD',
    '2026-03-02T08:00:00Z',
    [
      ['Park the robot and apply lockout to the welding power source', { warning: lockout }],
      'Remove the nozzle, contact tip and liner',
      'Fit the new liner, contact tip and nozzle',
      [
        'Set the wire feed tension and check shielding gas flow',
        { evidence: 'Record the gas flow in litres per minute.' },
      ],
      [
        'Verify the tool center point against the reference pin',
        {
          condition: 'The torch body, neck or liner was replaced.',
          rationale: 'A shifted tool center point places the weld off the joint.',
        },
      ],
      ['Run a test bead on a coupon and inspect it', { evidence: 'Photo of the coupon bead.' }],
      'Release the cell and log the consumables used',
    ],
  ),
  published(
    'smt-stencil-printer-service',
    'Stencil Printer Cleaning and Calibration',
    'DEK Horizon 03iX',
    '2026-03-09T08:00:00Z',
    [
      'Stop the line and remove the stencil',
      'Clean the stencil and wipe the underside',
      'Replace the squeegee blades and vacuum filter',
      'Refit the stencil and run vision calibration',
      [
        'Load fresh solder paste and note its expiry',
        {
          condition: 'The open jar is older than 8 hours or past its expiry date.',
          rationale: 'Aged paste slumps and causes bridging after reflow.',
        },
      ],
      'Print a test board and check alignment',
      'Release the lot and record the service',
    ],
  ),
  published(
    'press-brake-tool-changeover',
    'Press Brake Tool Changeover',
    'Trumpf TruBend 5130',
    '2026-03-16T08:00:00Z',
    [
      ['Move the ram to the top and apply lockout to the machine', { warning: lockout }],
      [
        'Release the upper tool clamps and remove the punch with both hands',
        { warning: 'Segmented punches can fall. Support the tool before releasing the clamp.' },
      ],
      'Remove the die and wipe the die seat',
      'Fit the new die and seat it against the stop',
      'Fit the punch and tighten the clamps',
      [
        'Close the ram slowly and check punch and die alignment',
        {
          rationale: 'A misaligned tool can crack under load.',
          durationMinSeconds: 60,
          durationMaxSeconds: 180,
        },
      ],
      [
        'Bend a trial part and measure the angle',
        { evidence: 'Record the measured angle against the drawing.' },
      ],
      'Load the bending program and record the tool set',
    ],
  ),
  published(
    'conveyor-gearbox-oil-change',
    'Conveyor Gearbox Oil Change',
    'SEW-Eurodrive R series',
    '2026-03-23T08:00:00Z',
    [
      ['Stop the conveyor and apply lockout to the drive', { warning: lockout }],
      [
        'Let the gearbox cool until the housing is safe to touch',
        {
          condition: 'The gearbox ran within the last hour.',
          warning: 'Hot oil can cause burns.',
          durationMinSeconds: 900,
          durationMaxSeconds: 3600,
        },
      ],
      'Place a drain pan below the drain plug and remove the vent plug',
      'Remove the drain plug and drain the oil completely',
      [
        'Inspect the oil and drain plug magnet for metal particles',
        {
          rationale:
            'Fine dust is normal wear. Chips or flakes point to a failing gear or bearing.',
          evidence: 'Photo of the magnet.',
        },
      ],
      'Refit the drain plug with a new seal washer and torque it',
      'Fill with the specified oil to the level plug',
      'Run the conveyor for five minutes and check for leaks',
      'Record the oil type, quantity and any wear found',
    ],
  ),
  published(
    'hydraulic-press-seal-replacement',
    'Hydraulic Press Seal Replacement',
    'Schuler 400 t press',
    '2026-03-30T08:00:00Z',
    [
      [
        'Lower the slide onto the safety props and apply lockout to the hydraulic power unit',
        { warning: lockout },
      ],
      [
        'Release stored pressure from the accumulator and confirm the gauge reads zero',
        {
          warning:
            'Accumulators hold pressure after shutdown. Do not open any line before the gauge reads zero.',
        },
      ],
      'Disconnect the cylinder lines and cap the open ports',
      'Remove the cylinder gland and slide out the piston rod',
      [
        'Remove the old seals and inspect the bore for scoring',
        {
          rationale: 'A scored bore will cut new seals within days.',
          evidence: 'Photo of the bore.',
        },
      ],
      'Fit the new seals with the assembly tool, lightly oiled',
      'Refit the rod and gland and torque the bolts in a cross pattern',
      [
        'Reconnect the lines, fill and bleed the cylinder',
        { durationMinSeconds: 600, durationMaxSeconds: 1800 },
      ],
      'Cycle the slide without load and check for leaks',
      'Record the seal batch numbers and close the work order',
    ],
  ),
  // Baselines for the scan files in test-data/processes.
  published('soldering-202', 'Soldering 202', 'Hakko FX-888D', '2026-02-09T08:00:00Z', [
    'Put on the ESD strap and set the iron to the alloy temperature',
    'Tin the tip and wipe it on the brass sponge',
    'Remove the old solder with braid or a desoldering pump',
    'Clean and flux the pads',
    'Solder the joint and feed solder until it wets the pad and lead',
    [
      'Inspect the joint under the magnifier',
      {
        rationale:
          'A good joint is shiny and concave. Dull or balled joints crack under vibration.',
        evidence: 'Record pass or fail for each joint.',
      },
    ],
    'Record the rework and return the board to test',
  ]),
  published(
    'iphone-11-screen-repair',
    'iPhone 11 Screen Repair',
    'iPhone 11',
    '2026-02-16T08:00:00Z',
    [
      [
        'Power off the phone and heat the display edges',
        {
          warning: 'A swollen battery can catch fire. Stop if the screen is lifting on its own.',
          durationMinSeconds: 60,
          durationMaxSeconds: 120,
        },
      ],
      'Open the display with a suction handle and opening picks',
      ['Disconnect the battery connector first', { warning: 'Never work on a live board.' }],
      'Disconnect and remove the old display',
      'Transfer the earpiece and sensor assembly to the new display',
      'Connect the new display and the battery',
      'Test the touch screen, Face ID and True Tone',
      'Fit a new adhesive gasket and press the display into place',
      'Record the part used and return the phone',
    ],
  ),
  published('shed-building', 'Shed Building', '8x10 gable shed kit', '2026-02-23T08:00:00Z', [
    'Clear and mark the site',
    [
      'Set the foundation blocks or skids',
      { rationale: 'An uneven base racks the frame and the doors stop closing.' },
    ],
    'Build the floor frame and fit the floor panels',
    'Raise and brace the wall frames',
    'Fit the roof trusses and sheathing',
    'Install the roofing and trim',
    'Hang and adjust the doors',
    'Walk through with the customer and record the job',
  ]),
  published('reset-bios', 'Reset BIOS', 'Dell OptiPlex 7090', '2026-03-02T08:00:00Z', [
    'Confirm the user has saved their work and back up any local data',
    'Shut down and disconnect power',
    [
      'Reset the BIOS to defaults from setup or by clearing CMOS',
      {
        warning:
          'Clearing the security chip or Secure Boot settings can trigger BitLocker recovery.',
      },
    ],
    'Boot the machine and confirm it reaches Windows',
    'Check the date, time and boot order',
    'Record the reset and close the ticket',
  ]),
  draft(
    'paint-booth-filter-change',
    'Paint Booth Filter Change',
    'Nordson PrecisionCoat booth',
    '2026-10-12T08:00:00Z',
    [
      'Stop spraying and purge the lines',
      [
        'Switch off the booth fans and wait for the airflow to stop',
        { warning: 'Dust can ignite. No ignition sources in the booth.' },
      ],
      'Remove the exhaust filter frames and bag them for disposal',
      'Check the differential pressure gauge reads zero with the fans off',
      'Fit the new filters with the arrows pointing along the airflow',
      'Restart the fans and confirm the pressure drop is in range',
    ],
  ),
  draft(
    'cmm-probe-calibration',
    'CMM Probe Calibration',
    'Zeiss Contura',
    '2026-10-14T08:00:00Z',
    [],
  ),
];

/** In-progress walkthroughs behind the two draft SOPs. */
export const manufacturingCaptures: ExpertCapture[] = [
  {
    id: 'paint-booth-walkthrough-01',
    processId: 'paint-booth-filter-change',
    expertReference: 'expert_finish_01',
    kind: 'text',
    text: [
      '1. Stop spraying and purge the lines',
      '2. Switch off the booth fans and wait for the airflow to stop',
      '3. Remove the exhaust filter frames and bag them for disposal',
      '4. Check the differential pressure gauge reads zero with the fans off',
      '5. Fit the new filters with the arrows pointing along the airflow',
      '6. Restart the fans and confirm the pressure drop is in range',
    ].join('\n'),
    questions: [
      'You included “Switch off the booth fans”. Why is that useful?',
      'When should this practice be used?',
    ],
    createdAt: '2026-10-12T08:30:00Z',
    expiresAt: '2026-11-11T08:30:00Z',
  },
  {
    id: 'cmm-probe-walkthrough-01',
    processId: 'cmm-probe-calibration',
    expertReference: 'expert_metrology_01',
    kind: 'text',
    text: [
      '1. Warm up the machine for 30 minutes',
      '2. Check the stylus tip for chips under the microscope',
      '3. Qualify the probe on the reference sphere',
      '4. Check the sphere diameter is within the tolerance',
      '5. Save the calibration and note the temperature',
    ].join('\n'),
    createdAt: '2026-10-14T09:00:00Z',
    expiresAt: '2026-11-13T09:00:00Z',
  },
];

export const manufacturingClarifications: Clarification[] = [
  {
    id: 'paint-booth-clarification-01',
    captureId: 'paint-booth-walkthrough-01',
    stepId: 'step-2',
    question: 'You included “Switch off the booth fans”. Why is that useful?',
    answer:
      'Running fans pull loose dust into the booth and the filter media can shed fibres while it is disturbed.',
  },
];

const demonstrationEvidence = {
  analysisVersion: 'demo-illustration-v1',
  demonstration: true,
  sopVersion: 1,
};

export const manufacturingFindings: Finding[] = [
  {
    id: 'finding-spindle-warmup',
    processId: 'spindle-bearing-replacement',
    title: 'Warm the spindle, then measure runout again',
    grade: 'strong',
    description:
      'Running a short warm-up cycle and re-measuring runout before release is associated with fewer returns after bearing replacement.',
    standard: 'Measure spindle runout at the taper and confirm it is within 5 microns',
    practice:
      'Run the spindle for 10 minutes at half speed, then measure runout again and recheck the preload.',
    baselineRate: 11.8,
    practiceRate: 4.6,
    technicians: 5,
    status: 'candidate',
    evidence: {
      ...demonstrationEvidence,
      sourceRecordIds: ['test-data-cnc'],
      sampleSize: 102,
      heldOutResult: 'Pattern remained on later jobs (illustrative)',
      methodology:
        'Illustrative scenario values from a fictional scenario, not computed statistical evidence.',
    },
  },
  {
    id: 'finding-mold-dry-cycle',
    processId: 'injection-mold-changeover',
    title: 'A second dimension check after cooling',
    grade: 'promising',
    description:
      'Measuring the first article again after a short cooling period catches flash and warpage that the first check misses.',
    standard: 'Mold the first article and measure the critical dimensions',
    practice: 'Measure the critical dimensions a second time after 3 minutes of cooling.',
    baselineRate: 12.4,
    practiceRate: 8.7,
    technicians: 6,
    status: 'candidate',
    evidence: {
      ...demonstrationEvidence,
      sourceRecordIds: ['test-data-mold'],
      sampleSize: 48,
      heldOutResult: 'Not enough later jobs',
      methodology:
        'Illustrative small sample from fictional test data. No reliable effect estimate.',
    },
  },
];
