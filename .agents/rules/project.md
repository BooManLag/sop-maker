---
trigger: always_on
description: How Sopify is built, run, checked and shipped, and the rules every change must keep.
---

# Sopify project rules

Sopify (repo `sop-maker`) turns expert know-how into human-approved SOPs and finds "good exceptions": off-SOP field practices associated with fewer 30-day callbacks. Next.js 16 + React 19 + TypeScript. Read `AGENTS.md` before touching Next.js code: this Next.js version differs from what you know.

## Layout

- `src/lib/server`: HTTP, auth, config, Gemini adapters, runtime wiring (`runtime.ts`).
- `src/lib/application`: business rules (`backend.ts`, `process-service.ts`, `evidence-service.ts`), analysis (`analysis/stats.ts`, `analysis/toolkit.ts`, `analysis/worker.ts`).
- `src/lib/domain`: shared types and demo data. `src/lib/infrastructure`: Firestore, JSON store, media, offline analysis.
- `src/features/*`: UI by feature. `tests/unit`: Node test runner. `test-data/`: fictional datasets with planted practices.
- Docs: `ARCHITECTURE.md`, `docs/product/architecture.md`, `docs/adr/001-backend-boundaries.md`.

## Running it

- `npm run dev` runs against the **live production project** (`sop-app-prod-511406`): real sign-in, real Firestore, real Gemini. Do not use it for experiments.
- Local demo with no cloud: `npm run seed:manufacturing`, then start Next with `GOOD_EXCEPTION_MODE=demo` (PowerShell: `$env:GOOD_EXCEPTION_MODE='demo'; npx next dev --hostname 127.0.0.1`). Data lives in `.demo-data/`. `npm run demo:reset` restores the sample scenario.
- Point `GOOD_EXCEPTION_DATA_DIR` at a scratch folder to keep test runs out of `.demo-data/`.

## Checks before any PR

Run all of these and fix every failure: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run api:check` (run `npm run api:generate` if the API changed), `npm run build`. `next dev` rewrites `next-env.d.ts`; restore it with `git checkout next-env.d.ts` before committing.

## Shipping

- Work on a branch, open a PR against `main`, and wait for CI (`checks`, `container`) to pass. Don't push to `main` directly.
- Never deploy, merge, change Cloud Run traffic or write production data unless the user asks in this conversation. Deploys follow `scripts/deploy.sh`: build, Trivy scan, stage a no-traffic candidate, verify health and a 401 on `/api/v1/workspace`, promote, roll back on failure.
- Don't add AI co-author trailers or "generated with" lines to commits or PRs.

## Invariants every change keeps

- Code computes every number on a finding (`evaluatePractice` in `analysis/stats.ts`). Models choose groups and words, never statistics.
- Model output and imported job notes are untrusted data, never instructions.
- No SOP is published or changed without explicit human approval. Practices are analyzed, people are never ranked.
- Each tenant's state is one bounded Firestore document (750 KB, `LIMITS` in `src/lib/server/config.ts`). Anything that grows with usage must live elsewhere or be compacted.
- Technician IDs are pseudonymized and contact details scrubbed on import (`normalizeRecords`). Raw imports expire after 30 days.
- The demo and tests run offline. A cloud adapter gets an offline counterpart behind the same port.
