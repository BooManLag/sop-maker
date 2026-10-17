# BigQuery evidence layer

Build plan. Status: **planned, not started.** Claims about the current system were read from the repository at commit `92e6e7f` and rechecked at `15faafe`. The central claim, that the statistics can move to SQL without changing a single number, was checked with a prototype (see [§4](#4-how-the-statistics-move-to-sql)).

## 1. Why

Imported job records live inside the tenant's single Firestore aggregate document (`scan.records`). That caps a scan at 1,000 rows (`LIMITS.rows`), a 1 MB request body and a share of the 750 KB tenant state ([ADR 001](../adr/001-backend-boundaries.md)). Since `15faafe` a finished scan drops all but the few rows its findings show as examples (`compactScan`), which keeps the workspace under its limit between scans. But every scan still has to fit whole while it is imported and analyzed, and the prototype workspace reached 707 of its 750 KB with four 240-row scans. A real plant or service region produces tens of thousands of jobs a year, so the product's core promise — turning operational records into evidence — stops at toy scale. The ADR already names the way out: "per-entity documents/BigQuery, not a larger document cap."

Goals:

- Scans of up to **200,000 records** (about 50 MB of CSV), uploaded as files, not JSON bodies.
- **Every finding number stays identical** to what `evaluatePractice` computes today. Code computes the statistics; neither the model nor ad-hoc SQL decides them.
- Records leave the Firestore aggregate. Firestore keeps SOPs, findings, trials and scan metadata, which stay small and human-reviewed.
- The local demo and `npm test` keep running offline with no BigQuery.

Non-goals for this plan: streaming ingestion from MES/CMMS systems, cross-scan vector search, forecasting, and Dataflow. [§9](#9-later-not-in-this-plan) says where they fit later.

## 2. Target shape

```
Browser ──signed URL──▶ Cloud Storage  imports/{org}/{scanId}/source.csv
   │                                   │
   └─ POST /scans/{id}/import ─▶ Cloud Tasks ─▶ /internal/import (Cloud Run)
                                                  ├─ parse + normalizeRecords (pseudonymize, scrub)
                                                  ├─ NDJSON ─▶ GCS ─▶ BigQuery load job ─▶ evidence.job_records
                                                  └─ readiness counts query ─▶ Firestore scan metadata

POST /scans/{id}/run ─▶ Cloud Tasks ─▶ /internal/analysis
   ├─ distinct note texts (query)
   ├─ embeddings: evidence.signal_embeddings cache, Vertex for misses
   ├─ leader clustering in Node (unchanged algorithm)
   ├─ ONE cohort-counts query ─▶ toolkit evaluates every practice in memory
   ├─ ADK agent (unchanged tools)
   └─ findings ─▶ Firestore (unchanged)
```

New Google Cloud pieces: one BigQuery dataset with two tables, one Cloud Tasks job type, and an `imports/` prefix in Cloud Storage. Cloud Run, Cloud Tasks, Cloud Storage, Vertex AI and Firestore are already in the stack.

## 3. Tables

Dataset `evidence`, location `var.region` (`asia-northeast1`), the same as Firestore.

### `job_records`

One row per imported job. Written only by load jobs from the import worker.

| Column | Type | Source |
| --- | --- | --- |
| `organization_id` | STRING, required | Verified actor's organization |
| `scan_id` | STRING, required | Scan the file was imported into |
| `import_date` | DATE, required | Partition column (UTC day the import ran) |
| `job_id` | STRING, required | `job_id` |
| `technician_ref` | STRING | HMAC pseudonym from `normalizeRecords`; `''` when blank |
| `asset_id` | STRING | `asset_id` |
| `equipment_model` | STRING | `equipment_model` |
| `job_type` | STRING | `job_type` |
| `job_ts` | TIMESTAMP | `Date.parse(timestamp)` in Node. NULL when it does not parse |
| `checklist_values` | STRING | `checklist_values` |
| `parts_used` | STRING | `parts_used` |
| `notes` | STRING | Scrubbed notes (emails and phone numbers removed) |
| `signal_text` | STRING | `signalText(record)` computed in Node, the only text a model sees |
| `signal_hash` | STRING | Hex SHA-256 of `signal_text`; NULL when `signal_text` is empty |
| `callback` | BOOL | `true`/`false`, NULL when unknown |

- Partitioned by `import_date`, **partition expiration 31 days**, so raw records disappear on the same schedule as today's 30-day retention without a scheduler. `require_partition_filter = true`. The scan stores its `importDate`, and every query passes it.
- Clustered by `organization_id, scan_id`.
- Timestamps and signal text are computed once in Node, at import. The SQL never re-implements `Date.parse` or `signalText`, which is what keeps the numbers identical.

### `signal_embeddings`

Cache of note embeddings, so a re-scan or an overlapping export does not pay for the same text twice.

| Column | Type |
| --- | --- |
| `organization_id` | STRING, required |
| `model` | STRING, required (e.g. `gemini-embedding-001`) |
| `dimensions` | INT64, required (256 today) |
| `signal_hash` | STRING, required |
| `embedding` | ARRAY&lt;FLOAT64&gt; |
| `created_date` | DATE, required, partition column |

- Keyed per organization: no cross-tenant reuse, so one tenant's notes can never be inferred from another's cache hits.
- Same 31-day partition expiration. Vectors are derived from free text and follow the raw-content policy. Lengthening it is an [open question](#10-open-questions).
- Duplicate rows from a retried attempt are harmless. Reads take one row per hash.

Cluster assignments are **not** stored. They travel as a query parameter (see [§4](#4-how-the-statistics-move-to-sql)), which makes every analysis attempt idempotent without DML.

Findings, trials and change requests stay in Firestore. `finding.evidence.sourceRecordIds` keeps its existing cap of 200 job IDs.

## 4. How the statistics move to SQL

**Decision: SQL counts, TypeScript does the math.** BigQuery returns jobs and callbacks per (cluster, cohort, phase). The Mantel-Haenszel rates, z, held-out check and grading stay in `stats.ts`, operating on those counts. The alternative — the whole calculation in SQL — would mean two implementations of the grading rules that have to be kept in step, and the agent would need a query per `evaluate_practice` call.

This works because leader clustering assigns each job to at most one cluster. For any set of clusters, a cohort's practice counts are the sum over those clusters, and its baseline counts are the cohort total minus that sum. So **one query per scan** returns everything; every `evaluate_practice` call and the funnel are pure arithmetic in memory.

### The counts query

```sql
-- @organization_id STRING, @scan_id STRING, @import_date DATE
-- @discovery_share FLOAT64 (must be FLOAT64, see below)
-- @assignments ARRAY<STRUCT<signal_hash STRING, cluster_id STRING>>
WITH ordered AS (
  SELECT
    job_id, technician_ref, equipment_model, job_type, callback, signal_hash,
    ROW_NUMBER() OVER (ORDER BY job_ts, job_id) AS rn,
    COUNT(*) OVER () AS n
  FROM evidence.job_records
  WHERE organization_id = @organization_id
    AND scan_id = @scan_id
    AND import_date = @import_date
    AND callback IS NOT NULL
    AND job_ts IS NOT NULL
)
SELECT
  a.cluster_id,
  o.technician_ref,
  o.equipment_model,
  o.job_type,
  IF(o.rn <= CAST(FLOOR(o.n * @discovery_share) AS INT64), 'discovery', 'held_out') AS phase,
  COUNT(*) AS jobs,
  COUNTIF(o.callback) AS callbacks
FROM ordered AS o
LEFT JOIN UNNEST(@assignments) AS a ON a.signal_hash = o.signal_hash
GROUP BY ALL
```

The output is small: cohorts × 2 phases × (clusters + 1). The 520-row CNC test file gives about 200 rows.

### What must match exactly

| `stats.ts` behaviour | SQL counterpart | Trap |
| --- | --- | --- |
| `chronological`: drop unknown callbacks and unparseable timestamps | `callback IS NOT NULL AND job_ts IS NOT NULL` | `job_ts` is NULL exactly when `Date.parse` was NaN at import |
| Sort by time, then `id.localeCompare` | `ORDER BY job_ts, job_id` (byte order) | Differs only for tied timestamps with IDs that collate differently. **Change the tie-break in `chronological` to a plain code-unit comparison** so both sides agree |
| `Math.floor(n * 0.7)` | `FLOOR(n * @discovery_share)` | Pass the share as **FLOAT64**. As NUMERIC, 520 × 0.7 is exactly 364. In IEEE doubles it is 363.99…, which floors to 363 |
| Cohort = technician + model + job type | Group columns | Blank technician is `''`, not NULL, so it still forms a cohort, as today |
| `technicians` = distinct non-empty technicians among followers | Derived in TS from rows where the cohort has both sides | — |

### Verified

A prototype ran this query (in SQLite, the same window and grouping logic) over all five `test-data/manufacturing` files. It evaluated 173 practice sets: every single cluster, pairs of clusters, and the planted practice. Computing from counts reproduced `evaluatePractice` exactly for jobs, technicians, z, both rates, the held-out result and the grade, with **0 mismatches**. That included `messy-records.csv` with its unknown outcomes, bad timestamps and blank technicians. The prototype becomes a permanent unit test in step 1 of [§8](#8-build-order).

### Readiness

`EvidenceEngine.readiness` reads seven counts. One query returns them, and the existing function is rewritten to take counts:

```sql
SELECT
  COUNT(*) AS records,
  COUNTIF(callback IS NOT NULL) AS with_outcome,
  COUNTIF(technician_ref != '') AS with_technician,
  COUNTIF(checklist_values != '') AS with_checklist,
  COUNTIF(job_ts IS NULL) AS invalid_timestamps,
  COUNTIF(equipment_model = '' OR job_type = '') AS missing_group,
  COUNTIF(notes != '') AS with_notes
FROM evidence.job_records
WHERE organization_id = @organization_id AND scan_id = @scan_id AND import_date = @import_date
```

## 5. Ingestion path

Replaces "parse in the browser, POST up to 1,000 rows as JSON" in production. The demo keeps the JSON path.

1. **Create.** `POST /api/v1/scans` with `{ processId, fileName, contentType, bytes }` creates the scan with status `awaiting_upload`. It returns a V4 signed upload URL for `imports/{org}/{scanId}/source` through the existing `UploadSigner`. Limits: CSV up to 50 MB, XLSX up to 20 MB (SheetJS holds a workbook in memory, and the instance has 1 GiB).
2. **Upload.** The browser PUTs the file straight to Cloud Storage, as recordings already do.
3. **Confirm.** `POST /api/v1/scans/{id}/import` checks the object exists (`MediaStorage.exists`), sets status `importing` and enqueues a Cloud Tasks job to a new internal route, `POST /api/v1/internal/import`. It is OIDC-verified the same way as `internal/analysis` and `internal/media`.
4. **Import worker.**
   - Read the object, parse it with SheetJS (already a dependency) and run the unchanged `normalizeRecords`. That keeps the HMAC pseudonyms, scrubbing, duplicate-ID and missing-ID errors.
   - Add `job_ts`, `signal_text`, `signal_hash` and `import_date`. Write NDJSON to `imports/{org}/{scanId}/records.ndjson`.
   - Start a BigQuery **load job** with job ID `import-{scanId}` into `job_records`. Load jobs are free, all-or-nothing, and a fixed job ID makes a redelivered task find the existing job instead of loading twice.
   - Run the readiness query. In one Firestore transaction, set `recordCount`, `importDate`, `readiness` and status `uploaded` or `ready`.
   - Delete both objects. Raw files never outlive the import.
5. **Failure.** Parse errors such as `Row 12: job_id is required.` set status `failed` with that message on the final attempt, like `failAnalysis`.

Firestore scan document changes (store schema v3): drop `records` for BigQuery-backed scans and add `importDate`, `source: 'inline' | 'bigquery'` (`recordCount` already exists), and statuses `awaiting_upload` and `importing`. No backfill. Existing inline scans keep working through the inline adapter until their 30-day expiry.

## 6. What changes in the scan worker

`AnalysisWorker.process` keeps its shape: snapshot input, analyze outside any transaction, commit with `completeAnalysis`, same idempotency and retry rules. What changes is where records come from.

| Today | After |
| --- | --- |
| `analysisInput` returns all records from the aggregate | Returns steps, SOP version and scan import metadata only |
| `clusterSignals(records, embedder)` embeds every record's text | `store.distinctSignals()` returns each distinct `signal_text` with its job count, ordered by first chronological occurrence. Embeddings come from `signal_embeddings`, and only misses go to `vertexEmbedder` and are then cached |
| Leader clustering over records | The same algorithm over distinct texts, weighted by job count. Identical texts have identical vectors, so they always land in the cluster of their first occurrence: **same clusters**. Examples become the first five *distinct* texts, an improvement |
| `AnalysisToolkit(records, steps, clusters)` | `AnalysisToolkit(counts, steps, clusters)`. `evaluate()` sums counts for the chosen clusters. `funnel()` reuses the same counts. No query per tool call |
| Proposal overlap check by shared job IDs | By shared cluster IDs (equivalent, since clusters are disjoint) |
| `p.jobIds.slice(0, 200)` | One query at the end: up to 200 job IDs per proposed finding, oldest first, filtered by the clusters' `signal_hash` values |

The ADK agent, its four tools, its instruction and `completeAnalysis` do not change. The agent still never sees a number that code did not compute.

### Ports

```ts
/** Where a scan's records live. Inline for demo and tests; BigQuery in production. */
interface EvidenceStore {
  readinessCounts(scan: ScanRef): Promise<ReadinessCounts>;
  distinctSignals(scan: ScanRef): Promise<{ hash: string; text: string; jobs: number }[]>;
  cohortCounts(scan: ScanRef, assignments: Assignment[]): Promise<CohortCount[]>;
  jobIds(scan: ScanRef, hashes: string[], limit: number): Promise<string[]>;
}
interface EmbeddingCache {
  get(org: string, hashes: string[]): Promise<Map<string, number[]>>;
  put(org: string, vectors: Map<string, number[]>): Promise<void>;
}
```

- `InlineEvidenceStore` computes the same four results in TypeScript from `scan.records`. It is what the demo, `npm test` and the Firebase emulator tests use.
- `BigQueryEvidenceStore` runs the SQL above. Every query is a static string in one file with named parameters and `maximumBytesBilled` set. A unit test asserts that each one filters `organization_id = @organization_id` and `import_date = @import_date`.

`evaluatePractice(records, ids)` stays as a thin wrapper (`toCounts` then `evaluateCounts`), so existing tests and evals keep their meaning.

## 7. Security, cost, operations

- **Tenant isolation:** the runtime service account is the only principal, so BigQuery row-level policies add nothing. Isolation is enforced in the adapter, as `forTenant` does for Firestore: required parameters, no string interpolation and a test over every SQL constant. Dataset-per-tenant is the upgrade path if a customer requires physical separation.
- **Privacy:** pseudonymization and scrubbing run before anything reaches Cloud Storage NDJSON or BigQuery. Raw uploaded files are deleted after import. Notes remain untrusted data in the agent prompt, as now.
- **IAM (Terraform):** enable `bigquery.googleapis.com`. Grant the runtime account `roles/bigquery.jobUser` on the project and `roles/bigquery.dataEditor` on the `evidence` dataset only, plus object create/read/delete on the `imports/` prefix.
- **Cost:** load jobs are free. A 200,000-row scan is roughly 100 MB in BigQuery (notes are stored twice, as notes and signal text), and with clustering each query reads at most that. On-demand pricing makes it a fraction of a cent per scan, inside the free tier for a prototype. `maximumBytesBilled` (1 GB) caps a runaway query. Embedding spend drops, because text is deduplicated per scan and cached across scans.
- **Observability:** log a `bigquery_job` event per query (feature, bytes processed, slot milliseconds, duration) next to the existing `ai_usage` events, and add it to the dashboard.
- **Retention:** partition expiration replaces the record purge in the retention endpoint for BigQuery scans. The endpoint still clears inline records.

## 8. Build order

Each step lands green on its own.

1. **Counts refactor, no GCP.** Add `CohortCount`, `toCounts`, `evaluateCounts` and readiness-from-counts. Make the toolkit run on counts and change the `chronological` tie-break. Turn the prototype into a unit test: for every file in `test-data/manufacturing` and many practice sets, `evaluateCounts(toCounts(...))` equals `evaluatePractice`.
2. **`EvidenceStore` port with the inline adapter.** The worker and readiness go through it. Behaviour is unchanged and all existing tests pass.
3. **BigQuery adapter and Terraform:** dataset, tables, IAM, API enablement and `infra/tests` safety assertions. Add `npm run eval:bigquery` (manual workflow, non-production project) that loads the test-data files and checks the BigQuery counts give the same evaluations as the inline adapter.
4. **File import:** endpoints, signed upload, the Cloud Tasks import job and worker, store schema v3, and the scan setup UI states (uploading, importing, failed). Raise production limits to 200,000 rows and 50 MB.
5. **Embedding cache and text dedup.**
6. Docs: update `architecture.md` (BigQuery moves out of "not used on purpose"), the ADR capacity section, `tech-stack.md` and the OpenAPI spec.

## 9. Later, not in this plan

- **Streaming ingestion:** Pub/Sub push subscription → Cloud Run ingest route → Storage Write API into `job_records`. It must go through Cloud Run, not a BigQuery subscription, because raw events would otherwise land in BigQuery before pseudonymization and scrubbing. Outcomes arrive weeks after the job, so this needs a separate `job_outcomes` table, and a scan becomes a time window instead of a file. Dataflow is not needed at this volume.
- **Cross-scan practices:** `VECTOR_SEARCH` over persisted embeddings to recognise the same practice across scans and sites. Needs retention longer than 30 days.
- **Trial duration forecast:** BigQuery time-series forecasting on weekly job volume, to tell a reviewer when a trial will reach `requiredPerGroup`.
- **Embeddings inside BigQuery** (`ML.GENERATE_EMBEDDING` via a remote model) instead of Node. Only worth it if the regional endpoint for `asia-northeast1` is available. Check before deciding.

## 10. Open questions

1. Retention: is 30 days right for job records in a manufacturing deployment, where cross-scan learning needs longer history? This is a product and legal decision, not a technical one.
2. Should production keep the JSON-rows path for small files (no upload round trip), or always use the file import?
3. XLSX: parse server-side up to 20 MB as planned, or convert to CSV in the browser and accept only CSV on the server?
4. Shared dataset clustered by organization, or dataset per tenant from day one?
