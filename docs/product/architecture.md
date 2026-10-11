# Good Exception backend architecture

Good Exception captures expert know-how into a human-approved SOP and investigates candidate practices through controlled validation. It analyzes practices, never worker rankings. The complete illustrative demo remains available locally. The backend now has verified Firebase identity and Firestore adapters, tested with isolated emulators; no live cloud project or AI provider has been connected.

## Boundaries

| Layer | Responsibility | Main files |
| --- | --- | --- |
| UI | Responsive process, finding and trial workflows | `src/app/(workspace)/`, `src/features/` |
| HTTP | Bounded request parsing, CORS, identity, safe errors, response codes | `src/lib/server/http.ts`, `contracts.ts` |
| Authorization | Verified organization/role, resource scope, reviewer/admin MFA | `src/lib/server/auth.ts` |
| Application | Workflow invariants, idempotency, short transactions, audit events | `src/lib/application/backend.ts`, `process-service.ts`, `evidence-service.ts` |
| Domain | Structured SOP versions, evidence, trials, proposals | `src/lib/domain/types.ts`, `src/lib/application/store.ts` |
| Repository port | Tenant-scoped atomic reads and writes | `src/lib/application/ports.ts` |
| Local infrastructure | Lease locking, fsync, atomic rename, backup/restore | `src/lib/infrastructure/json-repository.ts`, `backup.ts` |
| Cloud infrastructure | Firebase revoked-token verification and Firestore transactions | `src/lib/infrastructure/firebase.ts`, `firestore-repository.ts` |
| AI boundary | Input/output limits, strict candidate schema, failure isolation | `src/lib/server/ai.ts` |
| Runtime | Dependency composition, admission, health, logs and shutdown | `src/lib/server/runtime.ts`, `hooks.ts` |

Configuration comes from validated environment names; secrets are never returned, logged or included in drafts. Local demo identities are accepted only for loopback requests. Production fails closed unless Firebase/project, allowed origins and HMAC configuration exist, and Cloud Run refuses demo/emulator mode. Production Firebase authentication is backend-only at present: the UI still uses the demo flow and needs a separate sign-in integration before public use.

## Storage and lifecycle

The repository is scoped before any object lookup. Firestore uses one transactionally updated, versioned aggregate document per tenant; direct browser access is denied. The foundation explicitly caps serialized state at 750 KB, domain collections at 500 entries and retained audit entries at 1,000. It is not a warehouse-scale design. The [storage ADR](../adr/001-backend-boundaries.md) explains the capacity envelope, migration and eventual per-entity/BigQuery boundary.

Schema v2 migrates the old local JSON format without replacing current SOPs. Mutations enforce parent references, unique trial/finding and change/trial relations, valid published versions and organization consistency. Idempotency keys are scoped to actor/tenant and checked inside the transaction. Capture extraction runs outside the transaction; its draft fingerprint is checked before commit. Model output never publishes an SOP, changes privileges, computes outcome evidence or executes tools.

Raw capture content and imported rows have 30-day expiration; the retention endpoint purges expired raw content, while approved SOPs remain authoritative knowledge. Request keys expire after 24 hours and audit events after 90 days. Production scheduling, backup retention and a real restore drill remain external launch prerequisites. Local backup recovery is automated in tests.

## Current versus future integrations

- **Implemented and emulator-tested:** Firebase Admin token verification including disabled/revoked users, trusted custom-claim roles, Firestore transactions, tenant isolation and deny-all client rules.
- **Implemented locally:** both labeled demo product loops, import readiness, HMAC pseudonymization in configured mode, strict schemas, read/write limits, audit events, safe errors, health and diagnostic metrics, backup/restore, OpenAPI, CI and bounded load checks.
- **Explicitly unavailable:** live Gemini, binary media ingestion, BigQuery evidence computation, technician messaging, field-trial allocation/ingestion, RAG, agent tools, paid model usage and final organizational approval of v2. Production never substitutes sample evidence for these integrations.
- **Not deployed or claimed:** Cloud Run/Firebase Hosting, live IAM/KMS/TLS validation, automated cloud backups, retention scheduling, Cloud Monitoring alert delivery, autoscaling validation, a production sign-in UI or legal/provider data-processing approval.

Google Cloud remains the target: Next.js behind Firebase Hosting + Cloud Run; Firebase Auth; Firestore; Cloud Storage; BigQuery plus Python evidence jobs; Vertex AI through a backend adapter; Pub/Sub only once durable jobs exist; Secret Manager; Cloud Logging/Monitoring. No Kubernetes, Kafka or separate service mesh is introduced.

See the [API contract](../API.md), [complete checklist assessment](../backend-checklist.md), [operations runbook](../operations/runbook.md), and [threat model](../operations/threat-model.md).
