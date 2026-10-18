---
name: test-scans-with-data
description: Runs the fictional test datasets through a scan, locally in demo mode or on the production site, and checks that each dataset produces its expected finding. Use when testing scans, findings, readiness checks or storage limits, or after changing analysis code.
---

# Test scans with the test datasets

Each test file has one planted practice with a known expected grade. A scan passes when its findings match the tables below.

## Datasets and expected results

`test-data/processes/` (SOPs: Soldering 202, iPhone 11 Screen Repair, Shed Building, Reset BIOS):

| File                          | Local process ID          | Expected finding                                                             |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `soldering-202.csv`           | `soldering-202`           | **Strong**: IPA wipe and fresh flux before reflowing, 2.4% vs 17.5%          |
| `iphone-11-screen-repair.csv` | `iphone-11-screen-repair` | **Promising**: test touch and Face ID before sealing, 4.3% vs 13.2%          |
| `shed-building.csv`           | `shed-building`           | **Strong**: level the base, square the frame by its diagonals, 2.6% vs 17.1% |
| `reset-bios.csv`              | `reset-bios`              | **Promising**: suspend BitLocker, record boot settings first, 2.3% vs 10.4%  |

`test-data/manufacturing/`:

| File                                               | Local process ID              | Expected finding                                                      |
| -------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `cnc-spindle-bearing-replacement.csv` (or `.xlsx`) | `spindle-bearing-replacement` | **Strong**: spindle warm-up, then re-measure runout                   |
| `injection-mold-changeover.csv`                    | `injection-mold-changeover`   | **Promising**: second dimension check after cooling                   |
| `robot-weld-torch-service.csv`                     | `robot-weld-torch-service`    | **None**: decoy, the common practice makes no difference              |
| `smt-stencil-printer-service-small.csv`            | `smt-stencil-printer-service` | **Promising**: SPI check on the first boards                          |
| `insufficient-records.csv`                         | any                           | Fails readiness: fewer than 30 records                                |
| `messy-records.csv`                                | any                           | Fails readiness on 5 checks; the email and phone in notes are removed |

The numbers come from the app's own statistics. A scan should give exactly one finding per file, matching the table, and none for the decoy.

## Local demo (default; safe)

1. Use a scratch data folder so `.demo-data/` stays untouched. PowerShell:
   `$env:GOOD_EXCEPTION_DATA_DIR = "$env:TEMP\sopify-scan-test"; $env:GOOD_EXCEPTION_MODE = 'demo'`
2. Seed the SOPs: `npm run seed:manufacturing`.
3. Start the server in the same terminal: `npx next dev --hostname 127.0.0.1`. **Not** `npm run dev`, which runs against production.
4. Scan each file, for example:
   `node .agents/skills/test-scans-with-data/scripts/scan-local.mjs test-data/processes/soldering-202.csv soldering-202`
   The script refuses non-local servers. It prints readiness, the funnel and each finding with a link to its page.
5. Open one finding link in the browser. Check that "What the numbers say" explains the rates, the held-out check and the grade, and that "What technicians wrote" shows the practice notes.
6. Stop the server and run `git checkout next-env.d.ts`.

The demo groups notes offline by shared words (`OfflineNoteGrouper`), and a scripted analyst replaces the Gemini agent. Its findings are labelled `offline-demo-v1`.

## Production (only when the user asks)

Production is `https://sop-app-prod-511406.web.app`, a shared workspace that the whole team sees. Scans there write real data and use Gemini.

1. Get the user's go-ahead and say which files you'll upload.
2. Make sure the matching SOP is published (Processes). Production IDs are UUIDs, so pick the SOP by title.
3. In **Improve existing SOP**, choose the SOP, upload the CSV, check readiness, run the scan. Analysis usually takes one to three minutes.
4. Compare the findings with the tables. Gemini groups the notes, so the job counts can differ slightly if it adds a related note to the group. The grade and the practice must match.

## Reading failures

- **Funnel `[N, 1, 0, 0, 0]`:** all notes landed in one group, so grouping broke. Check `clusterSignals` and the grouper's output.
- **"Analyzing" for more than 5 minutes:** the first attempt failed and Cloud Tasks is retrying. After about 15 minutes the scan shows "did not finish".
- **Storage limit error:** the tenant document (750 KB) is full. Each unfinished 240-row scan holds about 90 KB until it finishes and compacts. Don't re-upload the same file repeatedly.
- **A finding for the decoy, or two findings for one file:** treat it as a regression in grouping or the analyst. Compare against `tests/unit/offline-analysis.test.ts`.

## Afterwards

Report each file's result (grade, practice, rates, technicians) against the expected table, and say which scans ran in production. Don't delete production data unless the user asks.
