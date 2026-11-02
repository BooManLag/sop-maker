---
trigger: glob
globs: src/lib/application/analysis/**, src/lib/application/evidence-*.ts, src/lib/infrastructure/offline-analysis.ts
description: Rules for changing scan analysis, grouping and the statistics behind findings.
---

# Scan analysis and statistics

- `evaluatePractice` and `THRESHOLDS` in `stats.ts` define every grade. Don't change their results. If you restructure them, prove parity on all files in `test-data/manufacturing` and `test-data/processes` against the old function.
- Jobs are compared only within a cohort: same technician, equipment model and job type. Blank technician is `''` and still forms a cohort.
- The oldest 70% of observed, validly dated jobs are discovery and the newest 30% held out. Sort by time, then job ID.
- Groups of notes must be disjoint: one job belongs to at most one group. Evaluation of combined groups relies on it.
- `signalText` is the only text a model sees: notes, checklist items not done, unusual parts. Never outcomes or technician IDs.
- Keep `tests/unit/offline-analysis.test.ts` expectations: each dataset yields exactly its planted finding and `robot-weld-torch-service.csv` yields none.
