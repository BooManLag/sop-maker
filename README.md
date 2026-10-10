# Good Exception

Create the standard from your best people. Improve it from what actually works.

A working B2B product foundation for capturing expert know-how, finding promising field practices, and validating a proposed SOP change. All evidence and trial outcomes in the sample scenario are visibly labeled **demo data**. Live Gemini and deployed Google Cloud resources are not connected. Firebase authentication and Firestore backend adapters are implemented and tested with local emulators; the demo UI does not yet have a production sign-in flow.

## Local setup

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run seed
npm run dev
```

No credentials are required for the local demo. `.env.example` documents validated demo/production configuration. Production mode requires verified Firebase bearer tokens and tenant/role claims. Open the app through your local development environment. Onboarding validation uses HTTP requests internally.

```sh
npm run typecheck
npm test
npm run build
npm start
```

Tests exercise privacy normalization, insufficient-data behavior, sample-size planning, human approval and the complete sample lifecycle. Tests use a temporary data directory and never touch your demo data. Normal seed preserves existing data; run `npm run demo:reset` to discard local demo changes and restore the scenario. Demo data persists in ignored `.demo-data/store.json`.

## Explore

1. **Create first SOP** → choose the sample walkthrough or paste your own text → edit/reorder/merge steps → answer one clarification at a time → review safety, rationale and evidence → explicitly approve and publish v1.
2. **Improve existing SOP** → select the seeded Valve Replacement baseline and sample service records → inspect data readiness → scan → review the second-pressure-check finding → ask why (sample response only) → create a demo controlled trial → load sample result → edit and export a v2 proposal → submit for human approval.
3. CSV/XLSX imports receive actual data readiness checks and pseudonymized technician references. Live statistical analysis deliberately stays unavailable. The included CSV is a format example, not a sufficient dataset.

Uploaded media is accepted as metadata but is not processed or retained as a binary. Use pasted text or the explicit sample. Uploaded SOP document interpretation is not connected; create/publish a structured SOP first. There are loading, error, empty and insufficient-evidence states.

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
