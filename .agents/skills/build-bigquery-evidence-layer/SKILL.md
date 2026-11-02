---
name: build-bigquery-evidence-layer
description: Implements the BigQuery evidence layer that moves scan job records and statistics out of the tenant's bounded Firestore document, one reviewed PR per build step. Use when building, continuing or reviewing that work, or when asked about scans larger than 1,000 rows.
---

# Build the BigQuery evidence layer

The plan is in `references/spec.md`: tables, the counts query, file import, worker changes and open questions. Read it first. It was written against commit `15faafe`; the section below lists what has changed since.

## 0. Before writing code

1. Confirm the work is wanted. The spec PR (#23) was closed on 17 Oct 2026 without a merge or a comment. Ask the user whether the team agreed to build it. Stop if they haven't.
2. Start from current `main`: `git checkout main && git pull --ff-only`, then one branch per step, e.g. `feat/evidence-counts`.
3. Read `.agents/rules/project.md` and `.agents/rules/analysis-statistics.md`.

## What changed since the spec

- **No embeddings.** Commit `52b06b1` replaced embedding clustering with Gemini grouping of the _distinct_ signal texts (`NoteGrouper` and `clusterSignals` in `analysis/toolkit.ts`, batches of `GROUP_BATCH`). Drop the `signal_embeddings` table and build step 5 (embedding cache). `distinctSignals()` from the spec now feeds the grouper directly, which suits the spec's dedup plan.
- **`signalText(record, usual)` needs dataset-wide context.** `usualValues(records)` decides which parts are unusual per equipment model. Compute `usual` over all rows at import, store the resulting `signal_text` and `signal_hash`, and never recompute it in SQL.
- **Audit events left the tenant document** (`4fcf543`). They now live in `organizations/{id}/auditEvents` (Firestore) or `audit.jsonl` (local), with a TTL on `expireAt`. Don't plan around audit capacity.
- **Finished and failed scans are compacted.** Finished scans keep only example rows (`compactScan`). Failed scans drop rows after 24 hours, and scans analyzing for over an hour are marked failed (`003d10c`). Keep the same lifecycle for BigQuery scans: partition expiry handles rows, Firestore keeps metadata.
- **A BigQuery dataset already exists** for the billing export (`google_bigquery_dataset.billing_export` in `infra/budget.tf`), and `bigquery.googleapis.com` is already enabled. Create a separate `evidence` dataset; don't reuse billing.
- **The offline demo** groups with `OfflineNoteGrouper` and analyzes with `offlineDriver` (`src/lib/infrastructure/offline-analysis.ts`). The inline `EvidenceStore` must keep both working.

## Build steps

Each step is one PR that passes every check in `.agents/rules/project.md` before review. Stop after each PR and report to the user. Don't start the next step until it's merged.

1. **Counts refactor, no cloud.**
   - Add `CohortCount`, `toCounts(records, assignments)` and `evaluateCounts(counts, groupIds)`. Make `evaluatePractice` a wrapper around them, and make `AnalysisToolkit.evaluate` and `funnel` run on counts.
   - Change the tie-break in `chronological` from `localeCompare` to a plain code-unit comparison.
   - Add a parity test: for every CSV in `test-data/` and many group sets (each group, pairs, all practice groups), `evaluateCounts` equals the old `evaluatePractice` in jobs, technicians, z, rates, held-out result and grade.
2. **`EvidenceStore` port with an inline adapter.** Add `readinessCounts`, `distinctSignals`, `cohortCounts` and `jobIds`, and route readiness and the worker through it. No behaviour change; every existing test passes unchanged.
3. **BigQuery adapter and Terraform.**
   - `evidence` dataset and `job_records` table: partition on `import_date`, 31-day expiry, `require_partition_filter`, clustered by `organization_id, scan_id`.
   - Runtime IAM: `roles/bigquery.jobUser` on the project, `roles/bigquery.dataEditor` on the dataset only. Add assertions to `infra/tests`.
   - SQL lives as static strings in one file with named parameters and `maximumBytesBilled`. Add a test that every query filters `organization_id = @organization_id` and `import_date = @import_date`.
   - Pass the discovery share as **FLOAT64**: NUMERIC changes the cut (520 × 0.7).
   - Add `npm run eval:bigquery` for a non-production project: load the test CSVs, compare BigQuery counts with the inline adapter.
4. **File import.** Signed upload to `imports/{org}/{scanId}/source`, a confirm endpoint, a Cloud Tasks import job on an OIDC-verified internal route, and a load job with ID `import-{scanId}`. Then the readiness query, store schema v3, scan setup UI states, and deleting the source files. Raise production limits only after this works.
5. **Docs.** Update `ARCHITECTURE.md`, `docs/product/architecture.md`, the ADR capacity section, `docs/tech-stack.md` and the OpenAPI spec.

## Rules for this work

- Never run Terraform `apply`, deploy, or load data into the production project. Use a non-production project for `eval:bigquery`, and only with the user's go-ahead.
- Production stays on the inline path until step 4 is merged and the user decides to switch.
- If a result can't match `evaluatePractice` exactly, stop and explain the gap. Don't loosen the parity test.
