<p align="center">
  <img src="public/brand/sopify-logo.svg" alt="Sopify" width="360" />
</p>

# Sopify

Create the standard from your best people. Improve it from what actually works.

For how the whole system fits together (frontend, API, data, AI, media and analysis pipelines, infrastructure), start with [ARCHITECTURE.md](ARCHITECTURE.md).

A working B2B product foundation for capturing expert know-how, finding promising field practices, and validating a proposed SOP change. All evidence and trial outcomes in the sample scenario are visibly labeled **demo data**. Live Gemini and deployed Google Cloud resources are not connected. Firebase authentication and Firestore backend adapters are implemented and tested with local emulators; the demo UI does not yet have a production sign-in flow.

## Local setup

Requires Node.js 22 or newer, npm and the gcloud CLI. Java 21 is needed only for the emulator tests.

```sh
npm ci
npm run dev
```

`npm run dev` runs the app locally exactly as in production, against the live Firebase project (`sop-app-prod-511406`, override with `GCP_PROJECT_ID`): real Google sign-in, real Firestore and Gemini. **Everything you do locally changes live data**, and every signed-in user joins the prototype organization as admin. No `.env` is needed; the launcher reads your gcloud credentials and fetches the pseudonym key itself. One-time setup: ask a project owner for access (below), then run `gcloud auth login` and `gcloud auth application-default login` with that account. Open the app at `http://127.0.0.1:3000` (not `localhost`, which is not an authorized sign-in domain).

### Contributor access

A project owner grants a contributor what `npm run dev` needs (Firestore, Vertex AI, the `sop-app-pseudonym-key` secret and the media bucket) from Git Bash, not WSL, signed in to gcloud:

```sh
bash scripts/grant-dev.sh someone@example.com [more@example.com ...]
bash scripts/grant-dev.sh --revoke someone@example.com
```

The demo mode with seeded sample data now runs only inside the automated browser tests.

```sh
npm run typecheck
npm test
npm run build
npm start
```

Tests exercise privacy normalization, insufficient-data behavior, sample-size planning, human approval and the complete sample lifecycle. Tests use a temporary data directory and never touch your demo data. Normal seed preserves existing data; run `npm run demo:reset` to discard local demo changes and restore the scenario. Demo data persists in ignored `.demo-data/store.json`.

For a fuller workspace, `npm run seed:manufacturing` adds a fictional manufacturing SOP library: seven published SOPs (CNC spindle bearings, mold changeover, weld torch service, stencil printer, press brake tooling, gearbox oil change, hydraulic seals), two drafts at different capture stages and two illustrative findings. It only adds what is missing, and `npm run demo:reset` removes it. Matching service-record files for scans are in [test-data/manufacturing](test-data/manufacturing/README.md).

## Explore

1. **Create first SOP** → choose the sample walkthrough or paste your own text → edit/reorder/merge steps → answer one clarification at a time → review safety, rationale and evidence → explicitly approve and publish v1.
2. **Improve existing SOP** → select the seeded Valve Replacement baseline and sample service records → inspect data readiness → scan → review the second-pressure-check finding → ask why (sample response only) → create a demo controlled trial → load sample result → edit and export a v2 proposal → submit for human approval.
3. CSV/XLSX imports receive actual data readiness checks and pseudonymized technician references. Live statistical analysis deliberately stays unavailable. The included CSV is a format example, not a sufficient dataset.

Audio walkthroughs (WebM or M4A, up to 10 MB and 10 minutes) can be uploaded or recorded in the browser. In the demo they are stored under `.demo-data/media/`, checked for their real type and length, and given a clearly labelled sample transcript that the expert checks and corrects before editing steps; speech recognition is not connected. Video and documents are not processed. Uploaded SOP document interpretation is not connected; create/publish a structured SOP first. There are loading, error, empty and insufficient-evidence states.

The default demo binds loopback and is for local demonstration. Production mode requires authentication, tenant-scoped access and explicit reviewer permissions. No messages are sent to technicians, no live jobs are assigned, and no SOP change is approved automatically. JSON exports preserve structural versions and evidence references. Worker rankings are never created.

See [architecture.md](docs/product/architecture.md) for domain boundaries, API contracts, statistical limitations, Google Cloud target services and production prerequisites. Deployment scaffolding is included but has not been deployed. Business and planning documents are indexed in [docs/README.md](docs/README.md).

## Browser verification

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite starts its own development server on port 3100 with a temporary data directory, so it can run alongside `npm run dev` without touching your demo data. It exercises both flows, verifies approval gates and unchanged baseline, checks mobile navigation, and rejects the insufficient sample CSV.

## Backend verification and operations

The backend is organized into HTTP, application, domain and repository layers. Requests use strict schemas; production uses Firebase ID tokens, tenant scoping and reviewer/admin MFA. Writes have transactionally enforced idempotency, audit events and workflow constraints. AI adapters cannot publish or fabricate authoritative evidence. The local demo retains its sample workflows.

```sh
npm run api:check
npm run format:check
npm run test:load
npx --yes --package firebase-tools@15.33.0 firebase emulators:exec --only auth,firestore --project demo-good-exception --config firebase.emulators.json 'npm run test:emulator'
```

The emulator test runner removes the live Google credential binding and refuses real project IDs or remote emulator destinations. `npm run test:emulator` alone expects both local emulators to be running. No real provider credentials are necessary.

`npm run backup -- create` creates a local demo snapshot. `npm run backup -- restore FILE --confirm-restore` explicitly restores it after integrity validation. Tests use separate temporary stores. Production Firestore backup scheduling and restore drills are still required before deployment.

See [the full backend checklist](docs/backend-checklist.md) for per-item evidence and remaining cloud/organizational prerequisites, [OpenAPI](docs/openapi.json), [API details](docs/API.md), and [the runbook](docs/operations/runbook.md). Cloud configuration, provider/legal review, monitoring and live performance are deliberately not marked complete by local tests.
