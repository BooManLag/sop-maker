# Manufacturing test data

Fictional shop-floor data for trying the app. Nothing here is real. Regenerate with `npm run testdata:generate` (output is deterministic).

In these files `callback_within_30_days` means **rework, scrap or return within 30 days**. The column keeps its name because the importer requires it.

## Service records (Improve existing SOP → upload)

| File                                            | Rows | Purpose                                                                                                                                                                                    |
| ----------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cnc-spindle-bearing-replacement.csv` / `.xlsx` | 520  | Same data in both formats. A spindle warm-up and second runout check is planted, with rework around 1% vs 12%. Scores **strong** with the app's analysis code.                             |
| `injection-mold-changeover.csv`                 | 460  | A dry cycle and second dimension check after cooling is planted, rework around 5% vs 12%. Scores **promising**.                                                                            |
| `robot-weld-torch-service.csv`                  | 210  | A coupon test bead and wire-tension check is common but makes no difference. Scores **no finding** (a decoy).                                                                              |
| `smt-stencil-printer-service-small.csv`         | 72   | Small sample with an SPI check on the first boards. Scores **promising**.                                                                                                                  |
| `insufficient-records.csv`                      | 14   | Fails readiness: fewer than 30 records.                                                                                                                                                    |
| `messy-records.csv`                             | 60   | Fails readiness: blank outcomes, technician IDs and checklists, an unreadable timestamp, a missing equipment model. Notes contain an email and a phone number, which the importer removes. |

Each dataset also holds a shortcut that raises rework (skipped final check) and unrelated notes (waiting for a crane, low coolant).

The scores are what `evaluatePractice` returns when the notes that describe the practice are grouped together. In demo mode, importing only runs the readiness check. Live scanning needs production mode and Gemini.

## Walkthroughs (Create first SOP → paste)

`walkthroughs/*.txt` hold one numbered step per line, matching the datasets above. Use:

| Field     | CNC                         | Mold                | Weld                 | SMT                     |
| --------- | --------------------------- | ------------------- | -------------------- | ----------------------- |
| Title     | Spindle Bearing Replacement | Mold Changeover     | Weld Torch Service   | Stencil Printer Service |
| Equipment | Haas VF-2                   | Engel e-victory 120 | Fanuc ARC Mate 100iD | DEK Horizon 03iX        |

Publish the SOP first, then pick it as the baseline when uploading the matching service records.

## Data shape

Technicians are `mt-###`, `sf-###` and `pe-###`, and are pseudonymized on import. Jobs run March to early September 2026, so every 30-day outcome is observed. Checklist values look like `lockout_applied:true;preload_set:true`.
