# Good Exception

Create the standard from your best people. Improve it from what actually works.

A working B2B product foundation for capturing expert know-how, finding promising field practices, and validating a proposed SOP change. All evidence and trial outcomes in the sample scenario are visibly labeled **demo data**. Real Gemini, Google Cloud resources and authentication are not connected.

## Local setup

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run seed
npm run dev
```

No credentials are required for the local demo. `.env.example` documents future integration names; those variables are not consumed yet. Open the app through your local development environment. Onboarding validation uses HTTP requests internally.

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

The current workspace has no authentication and is for local demonstration only. No messages are sent to technicians, no live jobs are assigned, and no SOP change is approved automatically. JSON exports preserve structural versions and evidence references. Worker rankings are never created.

See [architecture.md](architecture.md) for domain boundaries, API contracts, statistical limitations, Google Cloud target services and production prerequisites. Deployment scaffolding is included but has not been deployed.

## Browser verification

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite starts its own development server on port 3100 with a temporary data directory, so it can run alongside `npm run dev` without touching your demo data. It exercises both flows, verifies approval gates and unchanged baseline, checks mobile navigation, and rejects the insufficient sample CSV.
