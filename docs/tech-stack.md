# Technical Architecture — Good Exception

A list of the technologies, services and patterns the codebase uses. For domain boundaries and API contracts, see [product/architecture.md](product/architecture.md) and [adr/001-backend-boundaries.md](adr/001-backend-boundaries.md).

## Overview

```
Browser (Next.js/React client, Firebase Auth)
   │  Bearer ID token
   ▼
Firebase Hosting ──rewrite──▶ Cloud Run "sop-app" (asia-northeast1, Next.js standalone)
                                  ├─ Firestore (data, idempotency, audit)
                                  ├─ Vertex AI Gemini (gemini-3.5-flash, gemini-embedding-001)
                                  ├─ Google ADK scan agent
                                  ├─ Cloud Storage (media)
                                  ├─ Secret Manager (pseudonym key)
                                  └─ Cloud Tasks ──▶ /api/v1/internal/analysis (background worker)
```

## Frontend

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, `output: 'standalone'`), React 19 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), `tw-animate-css`, `tailwind-merge`, `clsx`, `class-variance-authority` |
| Components | shadcn/ui on Radix UI primitives, `lucide-react` icons, `sonner` toasts, `next-themes` dark mode |
| Data fetching | TanStack React Query, client-side (`src/lib/client/queries.ts`, `api.ts`) |
| Forms & validation | React Hook Form + `@hookform/resolvers` + Zod 4 |
| Auth (client) | Firebase JS SDK 12 — Google sign-in, ID tokens sent as bearer tokens |
| File import | SheetJS (`@e965/xlsx`) for CSV/XLSX |
| Media | In-browser audio recording/upload (WebM/M4A) |

Code is organized by feature in `src/features/*` (auth, capture, changes, findings, overview, processes, scans, trials), with shared UI in `src/components/{ui,layout,common}`.

## Backend

| Area | Technology |
| --- | --- |
| API | Next.js route handler catch-all `src/app/api/[...path]`, versioned `/api/v1` |
| Contract | OpenAPI spec generated to `docs/openapi.json` (`npm run api:generate` / `api:check`) |
| Layering | HTTP (`lib/server`) → application (`lib/application`) → domain (`lib/domain`) → infrastructure adapters (`lib/infrastructure`), with ports in `application/ports.ts` |
| Auth (server) | `firebase-admin` ID-token verification, tenant scoping, reviewer/admin roles via custom claims, MFA for privileged roles |
| Persistence | Firestore repository (prod); JSON-file repository + `proper-lockfile` for demo/tests |
| Write safety | Transactional idempotency keys, audit events, workflow constraints |
| AI | `@google/genai` on Vertex AI — Gemini `gemini-3.5-flash`, embeddings `gemini-embedding-001` |
| Agent | Google Agent Development Kit (`@google/adk`) scan agent (`lib/server/scan-agent.ts`) |
| Background jobs | Cloud Tasks queue (max 2 concurrent, 3 attempts) calling an internal worker endpoint, OIDC-authenticated as a dedicated service account |
| Observability | Structured JSON logs (`ai_usage` events), `instrumentation.ts`, Cloud Trace |
| Security headers | Strict CSP, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, restricted Permissions-Policy |
| Privacy | Technician references pseudonymized with a key held in Secret Manager |

## Google Cloud / Firebase infrastructure

Provisioned with **Terraform** (`infra/`, Google provider 6.50):

- **Cloud Run v2** — app service, region `asia-northeast1` (Tokyo)
- **Artifact Registry** — container images
- **Firebase Hosting** — fronts Cloud Run via rewrite; serves `/__/firebase/init.json`
- **Firebase Authentication / Identity Toolkit**
- **Firestore** — database, security rules (`firestore.rules`), indexes (`firestore.indexes.json`)
- **Vertex AI** — Gemini models
- **Cloud Tasks** — analysis queue
- **Cloud Storage** — media bucket, Cloud Functions source bucket
- **Secret Manager** — pseudonym key
- **IAM** — 8 dedicated service accounts, least-privilege role bindings
- **Workload Identity Federation** — keyless GitHub Actions auth
- **Cloud Logging / Monitoring** — log-based metrics (AI calls, tokens, latency) and a dashboard
- **Billing** — budget alerts; optional billing-cap Cloud Function (Gen 2) via Pub/Sub, dry-run by default

## Build, deploy & local dev

- **Docker** — multi-stage build on `node:24-bookworm-slim`, runs as non-root `node`
- **Deploy** — manual via `scripts/deploy.sh`; GitHub Actions workflows also exist in `.github/workflows` (`backend`, `deploy`, `eval`, `infra`)
- **Local dev** — `npm run dev` runs against the **live** Firebase project (real Auth, Firestore, Gemini), using gcloud ADC
- **Firebase emulators** — Auth + Firestore, used only for `npm run test:emulator`

## Quality & testing

| Kind | Tooling |
| --- | --- |
| Unit | Node test runner via `tsx`, Testing Library, jsdom |
| Integration | Firebase emulator suite (`tests/integration`) |
| E2E | Playwright (Chromium, desktop + mobile) |
| AI evals | `evals/` — extraction and scan cases (`npm run eval`) |
| Load | `scripts/load-test.ts` |
| Infra | Terraform tests (`infra/tests`) |
| Static | TypeScript (`next typegen && tsc`), ESLint 9 (`eslint-config-next`), Prettier + Tailwind plugin |
| Git hooks | Husky + lint-staged |

## Operations scripts

`seed.ts` / `demo:reset` (demo data), `backup.ts` (Firestore backup), `set-claims.mjs` (role claims), `openapi.ts` (API spec).
