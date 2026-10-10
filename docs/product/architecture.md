# Good Exception foundation

## Current implementation

Next.js App Router, React, TypeScript, Tailwind CSS v4, and REST handlers. The frontend is an accessible responsive workspace with Processes, Findings and Trials. Overview presents the two main paths. API calls are real local HTTP requests. Domain types live in `lib/domain.ts`; user interfaces never compute evidence statistics. `lib/api.ts` enforces lifecycle transitions, and `lib/services.ts` separates extraction from evidence analysis.

The entire local app is a **single-organization demonstration**, not a production service. There is no authentication, authorization or tenant isolation yet. Do not expose it publicly with real customer records. There are no worker scorecards, rankings or disciplinary outputs.

`JsonRepository` serializes writes and atomically replaces `.demo-data/store.json`. It is suitable for one local Node process only. It does not provide distributed transactions, encryption, retention policies or production audit logging. Drafts, published versions, captures, clarifications, imported records, findings, responses, trials and change requests are retained locally between restarts. Publish v1 explicitly requires human approval. Submitted v2 requests never replace v1 automatically. The foundation intentionally ends at human review; organizational final approval is not implemented.

## Boundaries and Google Cloud target

| Boundary | Local implementation | Google Cloud production target |
| --- | --- | --- |
| UI | Next.js workspace | Firebase Hosting rewrite to Next.js on Cloud Run |
| Identity | Explicit demo reviewer | Firebase Authentication, server-side verified ID tokens, organization-scoped roles |
| Application API | `/api/*` REST handlers | TypeScript Cloud Run service |
| Repository | `Repository` interface / atomic local JSON | Firestore with tenant-scoped document paths and transactional version approval |
| Uploads | File metadata and pasted text; CSV/XLSX parsed locally | Cloud Storage signed upload URLs, content validation and retention |
| Capture AI | `CaptureAdapter` / `DemoGeminiAdapter` | Vertex AI Gemini multimodal adapter, schema validation and evidence references |
| Evidence | `AnalyticsService` / `EvidenceEngine` readiness | Python Cloud Run Jobs, pandas/scipy/statsmodels, BigQuery cohort queries |
| Orchestration | Direct demo calls | Pub/Sub and Cloud Run Jobs with idempotent operation records |
| Credentials | None needed locally | Workload identity and Secret Manager; never put service account keys in the UI |
| Operations | Local errors and HTTP responses | Cloud Logging / Monitoring with identifiers redacted |

`firebase.json` and `Dockerfile` are deployment scaffolding, not provisioned infrastructure. No Google Cloud resources were created, and deployment has not been tested. Firebase project selection and Cloud Run resource creation require a separate deployment task. The configured Cloud Run service must actually exist before a Hosting deploy.

## Evidence integrity

The sample historical rates (6.2% vs 4.1%), 142 comparable jobs, 18 technicians, held-out narrative, and trial rates (4.4% vs 7.0%) are **illustrative scenario values**. They do not come from a fitted model and do not assert significance. No fabricated confidence intervals are shown. Sample funnels are labeled. Live analytics explicitly fails rather than returning demo findings for uploaded records. The downloadable CSV is a two-row format example and correctly fails readiness.

Imports validate unique job IDs, normalize outcomes and hash technician references before storage. The unsalted hash is only a demo pseudonymization strategy; production should use organization-scoped keyed HMAC with Secret Manager and exclude raw identifiers and personal notes from warehouse ingestion. Pseudonymization is not anonymization. Free-text redaction and real retention controls are still required.

Readiness checks minimum rows, callback completeness, technician references, equipment/job fields and checklist coverage. These are preliminary data checks, not proof of statistical identifiability. The uploader must supply fully observed 30-day outcomes; maturity is not independently inferred. Exact physical steps and sequences are not inferred from missing events.

Production evidence jobs must retain source record references, SOP version, analysis version, cohort eligibility, pseudonymized technician history, matching strata, sample counts, uncertainty estimates and held-out outcomes. Historical association creates a candidate only. Controlled validation requires prespecified allocation, outcome maturity, sufficient sample, safety constraints and approved analysis. The sample-size helper uses a standard two-proportion approximation (two-sided alpha .05, power .80); production planning must adjust for clustering and attrition.

Gemini may extract actions, ask questions, summarize rationale and explain trusted evidence. Gemini must never invent rates, determine statistical significance or approve changes. Human review remains a separate authority.

## API contracts

All paths use `/api`. POST bodies are JSON and errors return `{ "error": "message" }` with non-2xx status. GET `/workspace` returns current local state.

- POST `/processes`: `{title,equipment}`; GET `/processes/:id`
- POST `/processes/:id/captures`: `{expertReference,kind,text?,fileName?}`
- POST `/processes/:id/analyze-capture`: `{captureId,sample}`; returns steps, questions and demo notice. Non-text media is unsupported unless explicitly exploring a sample.
- POST `/processes/:id/clarifications`: `{captureId,stepId,question,answer}`
- POST `/processes/:id/publish`: `{steps,approved:true}`. Duplicate baseline publication is rejected.
- POST `/scans`: `{processId,demo,rows?}`; process must be published.
- POST `/scans/:id/readiness`: `{}`; POST `/scans/:id/run`: `{}`; GET `/scans/:id/findings`
- GET `/findings/:id`; POST `/findings/:id/request-explanation`: `{}` (sample response, sends no message); POST `/findings/:id/dismiss`: `{}`
- POST `/trials`: `{findingId,equipment,testGroup}`; GET `/trials/:id`
- POST `/trials/:id/results`: `{sample:true}`; explicitly loads an illustrative result, not real ingestion.
- POST `/change-requests`: `{trialId}`; validated trial required.
- POST `/change-requests/:id/submit`: `{proposedStep}`; enqueues a local review request, sends no notification.

## Before production

Connect and verify Firebase auth / tenant authorization, Firestore transactions and audit events, secure upload storage, Gemini schema contracts, BigQuery imports, Python evidence computation, job orchestration, real trial ingestion, approval policies and observability. Add request limits/rate limits, input schemas and authenticated data access. Do not mistake the demo for these capabilities.
