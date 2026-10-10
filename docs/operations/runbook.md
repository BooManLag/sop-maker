# Backend operations and recovery

## Local and emulator validation

The approved scope for this work is local and emulator validation. No resources, credentials, paid inference or deployment were created in a live Google Cloud project.

Use Node 24, npm and Java 21. `npm ci`, `npm run seed`, and `npm run dev` prepare the local demo; the development server binds loopback. `npm run build && npm start` verifies standalone mode. Browser tests use port 3100, their own temporary data directory and `.next-e2e`, so they do not rewrite the running app's output or customer data.

```sh
npm run typecheck
npm test
npm run api:check
npm run test:load
npx playwright install chromium
npm run test:e2e
npx --yes --package firebase-tools@15.33.0 firebase emulators:exec \
  --only auth,firestore --project demo-good-exception \
  --config firebase.emulators.json 'npm run test:emulator'
```

The emulator test wrapper requires exact loopback destinations and the `demo-good-exception` project, removes the live ADC binding, and creates randomly generated test users. It tests actual token verification, disabled users, tenant access, cross-instance transaction retries, rollback, and denial of direct Firestore access. Emulator success does not verify live IAM, TLS termination, KMS, billing, backups or regional resilience.

## Before production

Set `GOOD_EXCEPTION_MODE=production`, `GOOGLE_CLOUD_PROJECT`, `GOOD_EXCEPTION_ALLOWED_ORIGINS` (exact HTTPS origins), `FIRESTORE_DATABASE_ID`, and a >=32-character `GOOD_EXCEPTION_PSEUDONYM_KEY` using Secret Manager injection. Use workload identity for Firebase/Firestore. Do not commit key files or bake secrets into images. Keep emulator host variables unset. Cloud Run fails closed if demo mode or emulator hosts are configured. Runtime configuration is evaluated at startup and does not need production credentials at image build time.

Provision Firebase Authentication, trusted custom claims and MFA; verify bearer login in the frontend. Use a dedicated runtime service account with only the Firestore database access and Firebase user-read permissions required for token revocation checks. Limit Secret Manager access to the HMAC secret version. Exact custom IAM roles and deployed policy bindings need review in the target project. This is an external launch prerequisite, not verified by emulator tests.

Use managed HTTPS ingress only; configure exact allowed origins and the frontend API destination. The app sets HSTS on production API responses and restrictive browser headers. CSP permits inline Next.js scripts/styles; a nonce-based policy can tighten this before public rollout. No session cookies are used. Firebase login/recovery abuse protection and App Check policies are provider settings that require a real project.

Initial Cloud Run limits: concurrency 16, 1 vCPU, 512 MiB memory, max 2 instances, 30-second ingress timeout, no always-on background processing. The app admits 32 requests per process; service-level limits should be lower. Configure ready/live probes, graceful termination and Cloud Monitoring before routing traffic. These are proposed deployment limits, not a measured production capacity claim.

Enable Firestore daily backups with 7-day retention and point-in-time recovery. Verify an isolated restore in the selected region before any live release. Database payload indexing must be disabled via the supplied index configuration. Configure a scheduler to call the per-tenant retention operation with an authorized, recently authenticated administrative context; service-account retention automation needs a separately reviewed scoped workflow. No scheduler is deployed in this task. Raw content expires after 30 days and is inaccessible to processing once expired; durable removal requires the retention job. Backup retention must be aligned with deletion policy and legal obligations.

## Rollback and restoration

Local: `npm run backup -- create` writes a restrictive-permission snapshot. `npm run backup -- restore FILE --confirm-restore` explicitly replaces demo data only after checksum and invariant validation. Run against a separate data directory to rehearse recovery. The unit suite exercises this path automatically. Snapshot files contain application data; keep them out of Git and limit access. Local backups are not encrypted and are not a production backup strategy.

Production deployment plan: retain the previous immutable image digest and configuration version, deploy a zero-traffic revision, check authentication/readiness/authorization, canary at 5%, then expand only if errors and latency stay within objectives. Roll traffic back to the previous image on regression. Do not roll a database forward and assume an older binary can interpret it; v2 state is not supported by the old v1 binary. Export the previous state before migration and restore into a separate Firestore database; verify tenant access and approved SOP hashes before switching. No migration deletes the original JSON file on read. Never reset live data to demo seeds.

Provisional objectives for approval: RPO <=24h with daily backups (lower with verified PITR), RTO <=4h after a rehearsed restore, API availability 99.5%, normal read p95 <=500ms and p99 <=1s under the approved tenant limits. These are targets, not an SLA or validated cloud performance. Assign a named service owner, database owner, security contact and on-call escalation path before launch.

## Alerts and incident response

Structured request logs include generated request ID, route template, status, duration and hashed actor/tenant references; they omit tokens, bodies, model output and provider exception text. Success mutations also store an atomic audit event with actor/action/reference. An unhandled runtime failure emits a generic CRITICAL event and terminates, allowing the service supervisor to restart it. `/metrics` is an admin-only per-process diagnostic; Cloud Logging metrics must aggregate all instances.

Configure alerts: >2% 5xx for 5 minutes (minimum 100 requests), p95 >500ms for 10 minutes, continuous ready-probe failures for 2 minutes, RSS >80% memory limit, and sustained 429/503 capacity errors. A dashboard should show volume, 4xx/5xx, latency, in-flight work, memory and completed approval operations. Configuration and delivery to an actual responder remain pending.

On a database incident, stop new writes, retain request IDs and idempotency keys, check readiness and quota/capacity errors, and verify backup/PITR before recovery. Retry writes only with their original key. On authentication outage, fail closed; do not turn on demo mode. On invalid AI output/provider outage, keep the original draft, inspect aggregate error codes (not sensitive prompts), and disable/roll back the adapter. The current live AI adapter is disabled, so there are no provider calls, costs or live model fallback semantics to reconcile.
