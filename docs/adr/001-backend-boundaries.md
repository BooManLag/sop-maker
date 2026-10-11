# ADR 001: Explicit backend boundaries and bounded tenant aggregates

Status: implemented locally and tested against Firebase emulators.

HTTP owns parsing, byte limits, CORS, identity verification, response status and request logging. The application layer owns business transitions, role checks, idempotency, evidence safeguards and audit events. Repository ports own atomic units of work. Infrastructure owns local filesystem locking and Firestore transactions. Domain entities contain no HTTP request or Firebase SDK dependencies. AI adapters return candidate structures and have no repository, execution tools or authorization capability.

`Backend` accepts repository and extraction ports; `createHttpHandler` accepts authentication, admission control and observability ports. Tests can exercise failure behavior with injected providers without changing business logic. Firebase emulator integration tests exercise the real Admin SDK rather than hiding persistence/auth failures behind mocks.

Ownership in code: `src/lib/server` is the transport/security boundary; `src/lib/application` owns process/evidence transitions; `src/lib/infrastructure` owns provider adapters and recovery; `src/lib/domain/types.ts` owns shared domain types. Repository maintainers review backend and schema changes; organization-specific operational owners still need to be assigned before a deployment.

## Storage choice

The foundation uses one bounded aggregate document at `organizations/{verifiedOrganizationId}/backend/state`, containing a versioned JSON payload. Firestore transactions serialize updates across instances and retry conflicts at most three times. Identifiers are constrained before constructing paths. Browsers cannot access this collection; Firestore rules deny every direct client operation. Admin SDK access depends on deployment IAM as well as server-side tenant checks.

This deliberately bounded design matches the existing in-memory domain model and provides tested atomicity without pretending to be a large analytics warehouse. Each tenant is limited to 750 KB of serialized state and 500 entries per domain collection. Audit history is capped at 1,000 events: new writes fail explicitly rather than silently discarding unexpired evidence. Idempotency entries expire after 24 hours, audit events after 90 days, raw capture and imported record content after 30 days. A retention operation purges expired raw content; a scheduler must call it in a deployed environment. Capacity failures return explicit errors. Scale beyond these limits requires a separate migration to per-entity documents/BigQuery, not a larger document cap.

Reads use one point lookup; there are no N+1 document queries or composite-index query plans in this version. Payload indexing is disabled in `firestore.indexes.json`. The Admin SDK uses one reused client/channel pool per process, while application admission limits simultaneous work. Production Firestore latency and autoscaling require separate load tests; local results do not claim them.

Local JSON uses a per-process queue, a cross-process filesystem lock with a lease, revision numbers, unique temporary files, fsync and atomic rename. It is intended only for a local machine. Cloud Run refuses demo mode and cannot use the JSON adapter. `migrateStore` upgrades the previous unversioned JSON store to schema v2 without altering published versions; unknown formats fail closed. A local backup/restore utility checks SHA-256 and business invariants, and automated tests restore a separate directory before asserting state. No live data is used in tests.

## Human authority and failure behavior

Published baselines are immutable through capture and clarification. A new change request requires a validated trial and enters a human review queue. Neither a model response nor a proposed change modifies the current SOP. Sample-derived evidence is accepted only in demo mode. No backend functionality evaluates, ranks or disciplines workers.

External extraction runs before the short state transaction. The backend rechecks that the draft is unchanged before committing. Strict output schemas reject unsupported fields, fabricated evidence fields, commands, duplicated IDs and invalid durations. Provider errors, timeout and open-circuit conditions return an unavailable state. There is no unannounced provider fallback and no automatic model retry. No RAG, agent execution, payment or destructive tools exist in this application.
