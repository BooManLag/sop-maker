# Video-to-SOP pipeline and multi-format export

Build plan for agents. Status: **planned, not started.** No code was written for this document. Every claim about the current system below was read out of the repository at commit `1ceeab9`; every claim about Google Cloud names a service, and the few product-behaviour claims carry a source link in [Sources](#sources) because they must be re-verified before implementation.

Two features are specified here:

- **A. Video-first capture.** An expert records the job. The system transcribes it, lets the expert check the transcript and the extracted frames, and produces a step-by-step SOP where each step carries a frame from the video.
- **B. Portable export.** A published SOP exports as PPTX or PDF, not only JSON, so people who will never open a JSON file can read it.

They are independent and can ship separately. A depends on B being untouched; B works today on JSON-only data and does not need A.

---

## 1. Read this before writing code

Repo rules that override your training data:

1. **`AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing Next.js code.** This Next version has breaking changes. Do it.
2. **`node_modules/next/dist/server/lib/generate-agent-files.js` writes the `AGENTS.md` Next block.** Do not hand-edit that block.
3. Read `docs/product/architecture.md`, `docs/API.md`, `docs/operations/runbook.md` and `docs/adr/001-backend-boundaries.md` before touching the backend. They are short and they define the constraints this plan obeys.
4. Verification gates, all of which already pass today: `npm run format:check`, `npm run api:check`, `npm run typecheck`, `npm test`, `npm run build`. CI (`.github/workflows/backend.yml`) runs those plus Playwright, the Firebase emulator suite and `npm run test:load`. A change that breaks any of them is not done.
5. New unit tests go in `tests/unit/` as `*.test.ts` (or `.test.tsx`), using `node:test` and `node:assert/strict`, flat `test('...', async () => {})` calls, no `describe`.

### Invariants that must not break

These are product and security promises, not style preferences. Violating one is a failed change, not a trade-off.

| Invariant | Where it is enforced today |
|---|---|
| Model output never publishes, approves, changes privileges, computes evidence or executes tools | `publishProcess` requires `approved: true`; `architecture.md` |
| No worker rankings, ever | Product rule; findings reference sources, not people |
| Demo data stays visibly labelled `demo` | `demo` flags on captures, scans, trials, responses |
| Raw capture content expires after 30 days | `expiresAt` at creation; `retention` operation |
| Every lookup is tenant-scoped; foreign IDs return 404 | `RepositoryProvider.forTenant`; `process-service` guards |
| Model output is a strict, validated candidate — never authoritative | `extractionSchema.safeParse` → 503 on failure |
| Production writes carry an `Idempotency-Key` | `Backend.mutate`; 24 h replay cache |
| Reviewer/admin actions require recent MFA | `authorize` in `src/lib/server/auth.ts` |
| Binary media uploads are rejected until a content-inspecting storage pipeline exists | `createCapture` 422; `docs/API.md` |

---

## 2. The gate this feature must open

This is not an unplanned feature. The repository already names the exact prerequisite, twice:

> "Binary media uploads are explicitly rejected until an authenticated, content-inspecting storage pipeline exists." — `docs/API.md`

> "**Explicitly unavailable:** live Gemini, binary media ingestion, BigQuery evidence computation…" — `docs/product/architecture.md`

And the checklist already records the requirement: `docs/backend-checklist.md` item 5.5, "File uploads validate size, type, content and authorized access — Implemented | Binary media is explicitly rejected until content inspection/storage authorization exists."

So feature A is: **build the authenticated, content-inspecting storage pipeline the docs are waiting for**, then flip the rejection into real ingestion. The plan must carry all four of those properties — authenticated, size-validated, type-validated, content-inspected — or it is re-opening a gate that was deliberately closed.

The UI is already halfway there. `src/features/capture/capture-form.tsx` renders an `UploadArea` accepting `video/*,audio/*,.pdf,.txt,.docx` up to 20 MB, keeps the chosen file's **name only** in React state, and shows "Media extraction is not connected yet." The `File` object is discarded; nothing is read, hashed or uploaded.

---

## 3. Why none of this can run inline

Every current limit is smaller than a video by orders of magnitude. These are read values, not estimates:

| Limit | Value | Source | Consequence |
|---|---|---|---|
| `aiTimeoutMs` | 5 000 ms | `LIMITS`, `src/lib/server/config.ts` | A transcript cannot be produced in the AI slot |
| `requestTimeoutMs` | 15 000 ms | same | `withDeadline` wraps every request |
| `bodyBytes` | 1 000 000 | same | A video cannot be POSTed |
| `stateBytes` | 750 000 | same | Binaries cannot enter the aggregate; `validateStore` rejects |
| `responseBytes` | 800 000 | same | A PPTX/PDF cannot be returned as bytes |
| `captureCharacters` | 20 000 | same | A 20-minute transcript exceeds the capture text cap |
| `steps` | 100 | same | Step cap is fine; visuals are the pressure point |
| `recordsPerTenant` | 500 | same | A new job/asset collection competes for this budget |
| `aiCallsPerHour` | 20 per actor; ×5 per tenant | same | Video jobs need their own, separate quota |
| Cloud Run ingress timeout | 30 s; 1 vCPU; 512 MiB; max 2 instances | `docs/operations/runbook.md` | No synchronous media work |
| "no always-on background processing" | stated deployment limit | same | Worker must be a job, not a resident process |
| Container contents | `node:24-bookworm-slim`, no ffmpeg | `Dockerfile` | Frame extraction cannot happen in the web image |
| Firestore document | 1 MiB hard limit; one state doc per tenant | `firestore-repository.ts` | Binaries and big transcripts have no home |
| Transactions | async I/O is forbidden inside them | `json-repository.ts`, `firestore-repository.ts` | Upload/extract must stay outside the unit of work |

**Decision: the pipeline is asynchronous and job-based, with binaries in Cloud Storage and references in the aggregate.** Extraction keeps running outside the transaction, exactly as it does today, with the same fingerprint-checked commit — but a job replaces the inline call.

`docs/product/architecture.md` already permits the missing piece: "Pub/Sub only once durable jobs exist." This feature is what makes durable jobs exist, which is why that constraint is satisfied rather than bypassed.

---

## 4. Target architecture

Capability → service → rationale → where it plugs in.

| Capability | Service | Why this one | Plugs in at |
|---|---|---|---|
| Authenticated upload | Cloud Storage, V4 signed URL (resumable for large files) | The API is JSON-only and 1 MB-capped; the browser must not stream video through the Next.js process | New POST endpoint issuing a signed URL; CSP change |
| Trigger on upload complete | Cloud Storage event → Cloud Run trigger (Eventarc) | Server-side signal that the object really arrived; do not trust the client to say so | New worker entrypoint |
| Job orchestration | Pub/Sub + Cloud Run **Job** | Durable, retryable, off the request path; `runbook.md` forbids always-on processing | New job service |
| Transcription | Speech-to-Text v2, Chirp model, batch recognition | Word-level timestamps and confidence are what the "check the transcription" UX needs | `CaptureAdapter`-style port, new adapter |
| Procedure structure + frame reasoning | Gemini on Vertex AI (multimodal) | Frames and audio together; decides which moment illustrates a step | Same port, second adapter |
| Shot/scene hints | Video Intelligence API | Optional: candidate scene boundaries make frame proposals better | Worker |
| Frame extraction | Transcoder API spritesheet/thumbnail job, or ffmpeg inside the worker image | Transcoder needs no new runtime dependency; ffmpeg gives exact-timestamp control | Worker, never the web image |
| Transcript + frames + exports at rest | Cloud Storage, per-tenant prefixes, lifecycle rules | Anything over a few KB has no place in the aggregate | New bucket(s), new `MediaStore` port |
| Job state | Firestore (production) / JSON store (demo) | Reuses the existing repository, quota, audit and idempotency machinery | New `jobs` collection |
| Export rendering | Worker produces PPTX (and PDF from the same model) | Deterministic, offline-testable, no live provider needed to test | Worker |
| Delivery of the file | Signed URL returned in JSON | `responseBytes` is 800 KB and responses are `Content-Type: application/json` | New export endpoints |
| Secrets | Secret Manager | `runbook.md` already requires it | Config |
| Logs, metrics, alerts | Cloud Logging / Cloud Monitoring | Existing alert set must be extended to the worker | Ops |

### Two decisions worth arguing about

**Decision 1 — export is generated by a worker into Cloud Storage, and the API returns a URL.** The alternative is streaming bytes from the Next.js handler. That path is blocked four separate ways: `Content-Type` is set once for all responses in `src/lib/server/http.ts`, the success body is `JSON.stringify(result)`, `responseBytes` rejects anything over 800 KB with 413, and the browser client always sends `Accept: application/json` and does `response.json().catch(() => ({}))` — so binary bytes would silently degrade into `{}` and surface as "Something went wrong. Try again." Changing all four to serve binaries would fight the architecture. A signed URL is additive and keeps the JSON contract intact.

**Decision 2 — generate PPTX in Node, not through Google Slides.** The Slides API would give editable decks and a free PDF export path, and it is GCP-native. Rejected as the primary path because it makes export require a live provider with Drive scopes and a template-governed shared drive, and it puts export quality beyond the reach of `npm test`. This repository's whole testing culture is "the demo adapter runs offline; the real one fails loudly" (`DemoGeminiAdapter` vs `UnavailableCaptureAdapter`, Firebase emulators, a local JSON repository). PPTX generated in Node keeps that property. Revisit Slides as an optional extra once a live project exists.

---

## 5. Data model changes

All additive and optional, which `docs/API.md` explicitly allows inside v1: "Additive optional fields are compatible within v1. Removing or changing a field requires v2 and a migration window."

Shapes only — these are not final code.

```
MediaAsset                        # new entity, referenced from captures and steps
  id, organizationId
  kind: 'video' | 'audio' | 'frame' | 'transcript' | 'export'
  bucket, objectPath              # bytes live in Cloud Storage, never here
  mimeType, bytes, sha256
  durationMs?                     # video/audio
  atSeconds?                      # frame: the timestamp it was taken from
  derivedFromAssetId?             # provenance: frame → video, transcript → video
  createdBy, createdAt
  retentionExpiresAt              # 30 days, same rule as captures
  promoted: boolean               # true once referenced by a published version

ProcessingJob                     # new entity
  id, organizationId, processId, captureId?
  type: 'transcribe' | 'segment' | 'extract-frames' | 'export'
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired'
  stage?, progress?
  resultRef?: MediaAsset id       # transcript/export/frame set
  error?: { code, message }       # safe messages only
  createdAt, updatedAt, expiresAt

ExpertCapture                     # extended: two additive optional fields
  mediaAssetId?: ID               # the uploaded video
  transcriptAssetId?: ID          # the checked transcript

ProcessStep                       # extended: one additive optional field
  visual?: { assetId: ID, atSeconds: number, caption?: string, source: 'video_frame' | 'uploaded' }
```

Warnings for whoever implements this:

- **`ProcessStep` carries no media field today, and `evidenceLinks?: ID[]` is declared in both `src/lib/domain/types.ts` and `src/lib/server/contracts.ts` but is never read or written by any symbol.** Do not build on it; it is dead. Add a new field.
- **Every code path that rebuilds a step must carry `visual` forward.** Watch `saveDraftSteps` (renumbers), `moveStep`, `mergeWithNext`, `removeStep`, `addStep`, `applyClarifications`, `reviewedSteps` in `src/features/capture/review.tsx`, and the publish renumbering in `processService.publishProcess`. A spread that forgets the new field silently deletes images from a published SOP. This is the single most likely way to ship a data-loss bug, so make it a test.
- **All request schemas are `.strict()` and reject unknown keys.** Adding a field means changing `stepSchema` and `extractionSchema` in `src/lib/server/contracts.ts`, then `npm run api:generate` and committing `docs/openapi.json`.
- **Job and asset records consume `recordsPerTenant: 500` and `stateBytes: 750_000`.** A video with 40 candidate frames plus a transcript plus export records will not fit if left to accumulate. Finished jobs must be pruned the way `pruneExpired` already prunes idempotency and quota records, and transcripts must live in Cloud Storage, not in the aggregate.
- **Add `assets` and `jobs` to `collectionNames` in `src/lib/application/store.ts`,** or `validateStore` will not enforce the caps on them.
- **`migrateStore` must handle the new collections for existing v2 stores.** Unknown versions already fail closed with 503; keep that behaviour.

### Adding endpoints: the rules that will bite

- **`Endpoint` expresses `method: 'GET' | 'POST' | 'PATCH' | 'DELETE'`.** The CORS preflight advertises the same set, and the OpenAPI generator documents a body for POST and PATCH. Introducing another verb means changing all three.
- **`resolveEndpoint` rejects any path over 3 segments, and every segment must match `/^[A-Za-z0-9_-]{1,128}$/`.** `/processes/:id/exports` is legal. `/processes/:id/export/pptx` is not, and neither is any path ending in `.pptx` — both return 404, not a helpful error.
- **The signed-URL upload bypasses this API, so the API's CORS list can stay as it is — but the Cloud Storage bucket needs its own CORS configuration** allowing `PUT` (and `GET` if frames are displayed straight from the bucket) from the app origin. Missing bucket CORS surfaces in the browser as an opaque failed request, which is a miserable thing to debug.
- **Every new endpoint needs four edits plus a regeneration:** a `schemas` entry if it takes a body, an `endpoints` entry with `permission` and `create`, a `case` in `Backend.read` or `Backend.mutate`, a client method in `src/lib/client/api.ts` if the UI calls it, and `npm run api:generate` with the regenerated `docs/openapi.json` committed.
- **`tests/unit/http.test.ts` loops over every registered endpoint and asserts 401 without authentication.** A new endpoint that is accidentally reachable unauthenticated fails that test, which is exactly what it is for.
- **`requireDraft` refuses to work once `currentVersion > 0`.** A video capture is therefore one-shot per process, like the text capture before it. Re-processing a video against an already-published SOP is a change-request concern, not a re-run button — do not let the processing screen grow a "try again" control that quietly edits a published baseline.

---

## 6. The UX flow

The existing flow is a five-screen wizard with real routes, so the video flow extends it rather than replacing it. Current stages: `/processes/new` → `.../captures/:captureId/steps` → `/clarify` → `/review` → `/published`, with `draftPath(processId, captureId, stage, sample)` in `src/features/capture/paths.ts` building the URLs.

### Stage 1 — `/processes/new` (exists; extend)

`CaptureForm` already shows the upload zone, accepts `video/*`, and explains that media is not connected. Change: choosing a video starts an upload instead of printing that notice.

- Keep "or paste a walkthrough" and the sample walkthrough exactly as they are. Video is an additional path, not a replacement; the demo loop and its tests depend on the text path.
- Show the file name, size and duration once known, with a cancel control.
- Enforce real limits before upload begins: mime sniffing (the `accept` attribute is advisory only), max bytes, max duration. Fail with an actionable message, not a generic error.
- The 20 MB hint is far too small for real footage. Decide the real ceiling (see [Open questions](#10-open-questions-needing-a-human-decision)) and change the hint text with it.
- Local demo and tests must work with no GCP: a browser `File` never becomes a real object without a bucket. Provide a demo `MediaStore` that writes to the data directory, mirroring how `DemoGeminiAdapter` and `JsonRepository` make the rest of the product runnable offline.

### Stage 2 — processing (new route)

A new stage, for example `.../captures/:captureId/media`, or a processing state rendered by the existing steps route.

- Show named stages: Uploading → Transcribing → Splitting into steps → Choosing frames → Ready.
- Poll a job-status endpoint. The client already has the plumbing: `useWorkspaceMutation` invalidates queries on success, and `@tanstack/react-query` is in use throughout.
- A failure must name the stage and offer retry. Never show provider text: `runbook.md` requires safe error messages, and `safeError` already produces `{error, code, requestId}`.
- Leaving and returning must resume from server state, not browser state.

### Stage 3 — check the transcription (new)

This is the step the request calls out explicitly, and it deserves its own screen rather than a footnote.

- Show the transcript segmented with timestamps, aligned to proposed steps.
- Let the expert edit text, fix a misheard word, merge or split a segment, and re-run transcription for a range.
- Flag low-confidence spans rather than hiding them. Silent transcription errors become wrong SOPs, and this product's entire claim is that the standard is trustworthy.
- Keep a visible provenance line: "Speech-to-Text, <model>, <date>" or the demo equivalent.
- **Size constraint:** a real transcript will exceed the 800 KB response cap and must not enter the aggregate. Store it as a `MediaAsset` and serve it paginated, reusing the existing `limit`/`cursor` conventions from `querySchema`, or serve segments per step.

### Stage 4 — frames per step (new)

- For each step, propose candidate frames from the step's time window, with the timestamp visible.
- Let the expert pick a different candidate, nudge the timestamp, upload their own image, or mark the step as having no visual. A step without a picture must remain valid — `visual` is optional by design.
- Show the frame alongside the current wording, so the choice is made against the text it illustrates.
- Nothing here approves anything. Frames are proposals until a reviewer publishes.

### Stage 5 — existing steps / clarify / review / publish (unchanged, plus frames)

- `StepEditor`, `QuestionForm`, `ReviewForm` keep their behaviour. Add frame thumbnails as read-only context where useful.
- The publish gate is unchanged: `approved: true` is required, reviewer or admin, recent MFA. A video-derived SOP is not a shortcut past review; `capture-form.tsx` already tells the user "Nothing is published until a person reviews and approves it," and that line stays true.
- `src/features/processes/step-view.tsx` renders only `action`, `rationale`, `condition` and `warning` today — it does not even render `evidence`. It must render `visual` for the published read view to be worth anything.

### Stage 6 — export (extends an existing control)

`ExportButton` in `src/components/common/export-button.tsx` is used in three places (`living-sop.tsx`, `review.tsx`, `change-request.tsx`) and is purely client-side: `JSON.stringify` → `Blob` → `<a download>`. It has no format choice and no test.

- Keep the JSON path exactly as it is. `README.md` promises "JSON exports preserve structural versions and evidence references," and it works offline in the browser. Do not route JSON through the server.
- Add format choices for PPTX and PDF. Those need the server: the content is bigger than the response cap and must include image assets the browser would otherwise have to fetch and embed.
- State clearly in the UI that a generated export is a snapshot of a specific version, and put that version in the file.

---

## 7. Export formats

**PPTX** — one slide per step: step number and action, the frame, and the condition/warning/rationale that the step carries, plus a title slide with process name, equipment, version, approval status and a generated-at timestamp. Digestible by people who will never read JSON. Editable, which is what makes it usable in a meeting.

**PDF** — the same content and the same page model, rendered for print. Do not build two independent layouts; derive both from one intermediate structure so they cannot drift.

**Content rules**

- Frames are the point. A deck without images is a worse JSON file.
- Preserve the honesty of the source: published version number, approval status, and the demo label if the data is demo data. `README.md` is emphatic that sample evidence is visibly labelled, and an exported deck is the artifact most likely to escape into the world without its context.
- Include evidence references (`findingId`, `trialId`) on the steps that have them.
- Never include internal fields: `organizationId` and `approvedBy` are already stripped by `processDto`; keep it that way.
- Do not include anything the current JSON export omits without a deliberate decision, and write that decision down.

**Implementation constraints**

- **`scripts/openapi.ts` hard-codes the success response as JSON with no `content` object** — in `docs/openapi.json` 0 of 33 success responses carry content today. Export endpoints that return a JSON handle (the recommended shape) stay within that; endpoints that returned bytes would require changing the generator. Prefer the JSON handle.
- `npm run api:check` compares the committed `docs/openapi.json` byte-for-byte, so regenerate and commit it in the same change.
- A new dependency (a PPTX writer) must be considered for `serverExternalPackages` in `next.config.ts`, which currently lists only `firebase-admin` and `proper-lockfile`. `xlsx` is currently used **only** to read imports in the browser via a dynamic `import('xlsx')`; it has never been used server-side or to write a file.
- Generation must be idempotent and safe to retry, and the resulting asset must be tenant-scoped and not guessable.

---

## 8. Retention, privacy and provenance

`retention` already exists, is admin-only with MFA, expires raw capture text and imported rows after 30 days, and is called by a scheduler that does not exist yet. Video makes this harder in four specific ways.

1. **Video of a workplace is personal data.** Faces, voices, badges, screens, whiteboards, spoken names. `GOOD_EXCEPTION_PSEUDONYM_KEY` pseudonymizes technician *references*; it does nothing to a video. This needs a real decision before implementation, not a code comment.
2. **A frame that illustrates a published step must outlive the raw video.** Otherwise publishing an SOP silently breaks its own images 30 days later. The designed answer: mark assets `promoted: true` when a version referencing them is published, exclude promoted assets from the 30-day purge, and purge everything else — raw video, unpromoted candidate frames, transcripts, superseded exports. This is a deliberate exception to "raw content expires after 30 days," so it must be written into `docs/product/architecture.md` and the runbook, not only into code.
3. **Cloud Storage lifecycle rules must agree with the application's own retention.** Two mechanisms deleting different things on different schedules is how data outlives its policy. Pick one owner for deletion (recommend: the application, with the bucket lifecycle as a backstop) and document it.
4. **Bucket soft delete keeps deleted objects recoverable for another 7 days, and that is now a measured fact rather than a footnote.** The bucket provisioned below reports `soft_delete_policy.retentionDurationSeconds: 604800` — the current default. So a raw video the application deletes on day 30 is still restorable until roughly day 37, which is not what "raw content expires after 30 days" implies to a customer or a regulator. Either declare the grace period deliberately and write the real number into `architecture.md` and the runbook, or shorten it — but do not leave a 7-day discrepancy between the promise and the bucket default.

Also required: a consent/notice story for recording, an option to accept audio-only, an option to blur faces before frames are stored, and regional data residency — `runbook.md` treats region choice as a launch prerequisite.

---

## 9. Phasing

Each milestone is independently shippable and independently verifiable. Do not start a milestone before the previous one's acceptance criteria pass in CI.

### M0 — Decisions and scaffolding (no product code)

Resolve the [open questions](#10-open-questions-needing-a-human-decision). Choose bucket layout, region, retention ownership, upload ceiling, and whether frames are blurred. Decide the worker image (Transcoder vs ffmpeg). Nothing ships; the output is decisions recorded in the docs.

Verified sandbox state, read through the MCP connection on 2026-10-11 — the starting point for M1:

| Fact | Value |
|---|---|
| Project | `handy-cell-511314-j3` (number `961635868413`), created 2026-10-11 |
| Billing | **Enabled** — anything provisioned here costs real money |
| Storage bucket | `gs://handy-cell-511314-j3-sop-media` — `asia-southeast1`, uniform bucket-level access, public access prevention `enforced`, lifecycle deleting `raw/` after 30 days |
| Enabled APIs | project defaults plus `run`, `pubsub`, `eventarc`, `firestore`, `speech`, `aiplatform`, `transcoder`, `secretmanager`, enabled on request |
| Still disabled | `cloudbuild` and `artifactregistry` (both needed to build and publish the worker image), `videointelligence` (optional shot detection), and `iam` |
| Remaining M1 work | the `MediaAsset` and `ProcessingJob` entities, the `MediaStore` port with its filesystem demo adapter, the signed-URL endpoint, the CSP change. The bucket itself is done |

Two deliberate choices are baked into the bucket. It is one bucket with a prefix-scoped lifecycle rather than two, so promoting a frame is a move out of `raw/` and the retention rule follows the prefix rather than a second bucket's existence. And the storage class is `STANDARD` rather than a colder tier: frames get read at publish and at export time, so archival retrieval latency would cost more than the pennies it saves.

### M1 — Storage substrate, no AI

Signed-URL upload endpoint, `MediaAsset` and `ProcessingJob` entities, a `MediaStore` port with a Cloud Storage adapter and a **filesystem demo adapter**, job status endpoints, CSP update (`img-src` and `connect-src` currently allow only `'self'` and `data:`, which blocks both displaying a frame from a bucket and PUTting to a signed URL), upload validation, retention wiring.

*Acceptance:* in demo mode with no GCP credentials, a large video uploads from the browser, is hashed and recorded as an asset, is visible via a job-status endpoint, is tenant-scoped, rejects a wrong mime type and an oversize file with clear errors, and is purged by `retention` after its expiry. `npm test`, `format:check`, `api:check`, `typecheck` and `build` pass. The registry-driven test that asserts every endpoint rejects missing authentication still passes.

### M2 — Transcription and the check screen

A transcription adapter behind a port, a real provider implementation that fails loudly when unconfigured (following `UnavailableCaptureAdapter`), a demo implementation for tests, the transcript storage path, and the check/edit UI.

*Acceptance:* demo mode produces a transcript and the check screen renders it with timestamps; edits persist; a transcription failure produces a safe error, a retryable job and no partial SOP; the transcript never enters the aggregate.

### M3 — Steps with frames

Extend `extractionSchema`/`stepSchema` with `visual`, make the segmentation adapter return step boundaries with time ranges, extract frames, build the frame picker, and render frames in the published view and the step editor.

*Acceptance:* a published version contains one frame per illustrated step; a step with no visual still publishes; `moveStep`/`mergeWithNext`/`removeStep`/`applyClarifications`/`reviewedSteps`/publish **all** preserve `visual` — each has a test; frames referenced by a published version survive the retention job; unpromoted frames do not.

### M4 — PPTX and PDF export

Export job, one intermediate page model, two renderers, asset storage, signed-URL delivery, format choice in `ExportButton`, and the first tests `ExportButton` has ever had.

*Acceptance:* a published SOP exports as PPTX that opens in PowerPoint and Google Slides, and as PDF; both show the same steps, order, frames and warnings; both carry the version and approval status; a demo SOP is labelled as demo; the export endpoint returns a URL rather than bytes; `api:check` passes after regeneration.

### M5 — Hardening

Worker IAM scoped to the buckets and models it needs (the current runtime account is Firestore plus Firebase user-read only), Secret Manager, separate quotas for video jobs (`aiCallsPerHour` is per actor and per tenant and was never sized for media), audit events for upload and export, Cloud Monitoring alerts for job failure and queue depth, load test, threat-model update, runbook update, checklist items 5.5 and 6.6 marked with real evidence.

---

## 10. Open questions needing a human decision

These are the questions that should not be answered by whoever writes the code first.

1. **Upload ceiling and duration.** A 20 MB hint is not real footage. What is the largest video a design partner will actually upload, and does the product cap it or reject it?
2. **Frame retention vs the 30-day raw rule.** Confirm the `promoted` exception in writing. This changes a documented retention promise.
3. **Privacy.** Consent, notice, blurring, audio-only, and whether video may leave the customer's region. `docs/backend-checklist.md` already records provider/legal review as pending; this is the feature that makes it urgent.
4. **Speech-to-Text vs Gemini-only.** Two providers means two error modes, two cost lines and two quality envelopes; one is simpler but gives weaker timestamps. Recommend Speech-to-Text for the transcript and Gemini for structure, then measure.
5. **Language coverage.** Chirp's language support and the customer's language must be checked before promising anything. There is a `tests/fixtures/capture-eval.v1.json` convention for versioned evaluation fixtures — build a video equivalent for whatever is claimed.
6. **Cost per SOP.** Speech-to-Text, Vertex AI, Transcoder, Cloud Storage and worker minutes all scale with video length. `docs/finance/numbers.json` is the existing cost-model pattern; add video rather than guessing in a comment.
7. **Export fidelity owner.** Who signs off that a deck is readable by the audience it is for? A generated deck is a customer-facing artifact.
8. **Does the worker need to run at all in demo mode?** Recommend yes, with a local fake, so CI exercises the full flow without GCP.

---

## 11. Non-goals

Out of scope, deliberately, and they should stay out unless someone re-plans them:

- Auto-publishing. A video never becomes an approved SOP without a human reviewer.
- Video editing, trimming or hosting for playback.
- Storing video, frames or transcripts in Firestore or the JSON store.
- Synchronous processing in the request path.
- Worker rankings in any form. Transcription may identify *who spoke* for attribution; it must never become a productivity metric.
- BigQuery evidence computation, RAG, agent tool use, or live messaging.
- Kubernetes, Kafka, or any bus beyond Pub/Sub.
- Making the Next.js web image carry ffmpeg or Chromium.

---

## 12. Google Cloud MCP: build-time tooling, not runtime

**Status: configured on this machine, not yet usable.** The official `@google-cloud/gcloud-mcp` server is installed and wired into the `web` DSH profile, but two things are still outstanding — a session restart (the profile patch is applied at load) and gcloud authentication. Both are recorded in [Machine-local GCP setup](#machine-local-gcp-setup) below. Nothing in this repository depends on it, and nothing should: it is a build-time convenience, and the app must keep running and failing safely with no provider at all.

Before it was configured, nothing was set up anywhere relevant — `C:\Users\FP\.dsh\settings.yaml` holds only UI and model settings, and `C:\Users\FP\.claude.json` has no global `mcpServers` and no entry for this project.

DSH does support MCP, via `@deepseek-ai/dsh-mcp-client`, configured as either stdio or Streamable HTTP (see `docs/config-catalog.md` in the DSH checkout, section `@deepseek-ai/dsh-mcp-client`). Tool names arrive namespaced as `mcp__<serverName>__<rawName>`, and `serverName` must match `[A-Za-z0-9_-]{1,32}`.

**The distinction that matters:** a GCP MCP server is a tool for *agents doing GCP work during development and operations*. It is not a runtime dependency of this product, and it must never become one. The application talks to Google Cloud through its own adapters and SDKs behind the existing ports, for the same reason `capture-form.tsx` says "Demo extraction adapter. Real Gemini processing is not connected." — the product has to run, be tested and fail safely without any provider. An MCP server with GCP credentials is a privileged development convenience.

Where it would genuinely help, once configured:

- Provisioning buckets, lifecycle rules, service accounts and IAM bindings for M1 and M5.
- Inspecting job runs, queue depth and logs while building the worker.
- Querying BigQuery later, when evidence work starts (a BigQuery MCP server exists).

Google publishes official Cloud MCP servers, with a supported-products list at [docs.cloud.google.com/mcp/supported-products](https://docs.cloud.google.com/mcp/supported-products) and servers in [github.com/google/mcp](https://github.com/google/mcp); BigQuery has its own documented setup at [Use BigQuery MCP server](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp). Confirm the current list before wiring anything, and treat a GCP-credentialed MCP server as production-adjacent: scope it to a non-production project, never point it at customer data, and keep it out of CI.

### Machine-local GCP setup

None of this is in the repository — it is machine-local DSH configuration, recorded here so it can be reproduced or removed deliberately.

| Piece | Path | What it does |
|---|---|---|
| Profile patch | `C:\Users\FP\.dsh\profiles\web\cordis.patch.yml` | One `insert` row: `id: mcp-gcloud`, `name: '@deepseek-ai/dsh-mcp-client'`, `serverName: gcloud`, `transport: stdio` |
| Server install | `C:\Users\FP\.dsh\mcp\gcloud-mcp` | `@google-cloud/gcloud-mcp@0.5.3`, installed locally so startup needs neither `npx` nor network |
| Extra denylist | `C:\Users\FP\.dsh\mcp\gcloud-mcp-config.json` | Passed as `--config`; denies irreversible operations |

The server is launched as `node <install>/node_modules/@google-cloud/gcloud-mcp/dist/bundle.js --config <denylist>`. Tool names arrive namespaced by `serverName`, so the model sees `mcp__gcloud__run_gcloud_command`.

Access control, verified by reading the shipped bundle rather than assumed. The server ALWAYS applies a built-in denylist (`compute ssh`, `cloud-shell ssh`, `app instances ssh`, `interactive`, `meta`, and related), and the `--config` file adds `allow`/`deny` arrays on top. Matching is by whole-word prefix after lowercasing and trimming, and the compared command excludes both the `gcloud ` prefix and the arguments — so `"projects delete"` matches `gcloud projects delete <id>` and does not match `projects deleted`. The extra denylist currently blocks `projects delete`, `iam service-accounts keys create`, `storage rm`, `compute instances delete`, `container clusters delete`, `sql instances delete` and `firestore databases delete`. Add or remove entries there; an empty `allow` array means "everything not denied".

Two things were still required after configuration, both outside what an agent can do:

1. **Restart the DSH session.** The profile patch is applied when the profile loads, so a running session does not gain the tools.
2. **Authenticate gcloud in a normal terminal** — `gcloud auth login`, then `gcloud config set project <non-production-project-id>`. Interactive browser consent cannot be done from an agent shell.

The MCP child process runs unconfined: `dsh-mcp-client` builds an `StdioClientTransport` from the MCP SDK directly and borrows only the credential-scrubbed environment, not the shell's file sandbox. That is why a confined agent shell cannot meaningfully probe the server end to end, but the configured server does work.

---

## Sources

Product behaviour that must be re-verified before implementation, because it changes:

- [Chirp: Universal speech model — Speech-to-Text V2](https://docs.cloud.google.com/speech-to-text/v2/docs/chirp-model) — batch recognition, long audio, language coverage
- [Chirp 3 Transcription](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3) — current transcription model
- [Generating a spritesheet of video frames — Transcoder API](https://docs.cloud.google.com/transcoder/docs/how-to/generate-spritesheet) — frame extraction without a custom ffmpeg image
- [Create triggers from Cloud Storage events — Cloud Run](https://docs.cloud.google.com/run/docs/triggering/storage-triggers) — the upload-complete trigger
- [Analyze video files with the Gemini API on Vertex AI](https://firebase.google.cn/docs/vertex-ai/analyze-video) — multimodal video input
- [Process video with Cloud Run jobs and the Video Intelligence API](https://codelabs.developers.google.cn/codelabs/how-to-use-cloud-run-jobs-video-intelligence-api-process-video) — worker shape
- [Google Cloud MCP servers: supported products](https://docs.cloud.google.com/mcp/supported-products) · [github.com/google/mcp](https://github.com/google/mcp) · [BigQuery MCP server](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp)

Repository sources for every "today" claim above: `docs/product/architecture.md`, `docs/API.md`, `docs/operations/runbook.md`, `docs/adr/001-backend-boundaries.md`, `docs/backend-checklist.md`, `src/lib/server/config.ts`, `src/lib/server/contracts.ts`, `src/lib/server/ai.ts`, `src/lib/server/http.ts`, `src/lib/application/process-service.ts`, `src/lib/application/backend.ts`, `src/lib/domain/types.ts`, `src/lib/domain/steps.ts`, `src/lib/infrastructure/firestore-repository.ts`, `src/features/capture/capture-form.tsx`, `src/components/common/export-button.tsx`, `next.config.ts`, `Dockerfile`.
