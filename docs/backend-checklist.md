# Backend checklist assessment

Date: 2026-10-10. Approved scope: **local and Firebase emulator validation only**. Upstream workflow fixes (`86abd1c`) and the latest documentation reorganization (`43ad5ad`) are preserved.

**Implemented** = code with local/emulator evidence. **Partial / external gate** = work exists but deployment/organizational validation remains. **Pending integration** = unavailable capability or uncompleted required review. **Not applicable** = no such feature is exposed; implementing it reopens its requirements. This is not a production-readiness certification.

Evidence: `tests/*.test.ts`, `tests/integration/firebase.test.ts`, `tests/browser/lifecycle.spec.ts`, `docs/evidence/local-load.json`, `docs/API.md`, the architecture ADR, and operations/threat-model runbooks.

## 1. Architecture and Code Organization

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 1.1 | P0: Business logic is separated from controllers, routing and infrastructure code. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.2 | P1: Code follows a consistent architecture such as layered, hexagonal or clean architecture. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.3 | P0: Configuration and secrets are not hardcoded into the application. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.4 | P1: Dependencies are injected where needed to support testing and replacement. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.5 | P1: Responsibilities are clearly divided among services, repositories and domain models. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.6 | P1: Service-to-service contracts and dependencies are documented. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.7 | P1: Architecture decisions are documented for important technical choices. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |
| 1.8 | P1: Modules have clear ownership, minimal coupling and appropriate boundaries. | Implemented | Layered services and dependency-injected ports; docs/product/architecture.md and docs/adr/001-backend-boundaries.md. |

## 2. API Design and Contracts

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 2.1 | P0: All API inputs are validated on the server using strict schemas. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.2 | P0: Every API operation verifies authentication and required authorization. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.3 | P0: API responses avoid exposing internal fields, stack traces or sensitive data. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.4 | P1: Endpoints follow consistent naming, HTTP methods and status codes. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.5 | P1: A standard error response structure is implemented. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.6 | P1: Pagination, filtering and sorting are supported where needed. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.7 | P1: Idempotency keys or equivalent safeguards protect retryable create and payment operations. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |
| 2.8 | P1: API contracts are documented through OpenAPI or equivalent specifications. | Implemented | OpenAPI is generated from runtime request schemas; response shapes documented in docs/API.md. CI detects schema drift. |
| 2.9 | P1: Public API compatibility and versioning policies are established. | Implemented | /api/v1 is canonical and /api is a compatibility alias; breaking changes require v2. |
| 2.10 | P1: Request sizes and payload nesting are bounded. | Implemented | Strict shared schemas, registered methods/roles, scoped idempotency and DTOs; lib/server/contracts.ts, docs/API.md and docs/openapi.json. |

## 3. Authentication and Authorization

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 3.1 | P0: Passwords are securely hashed with Argon2id, scrypt or properly configured bcrypt. | Not applicable | No application passwords are stored; Firebase owns password hashing. Emulator credentials are random test fixtures. |
| 3.2 | P0: Authorization is checked on every relevant resource, including tenant and object ownership. | Implemented | Verified Firebase claims and role/MFA checks; tests/backend.test.ts, tests/http.test.ts and tests/integration/firebase.test.ts. |
| 3.3 | P0: Users cannot elevate privileges by modifying request bodies or resource IDs. | Implemented | Verified Firebase claims and role/MFA checks; tests/backend.test.ts, tests/http.test.ts and tests/integration/firebase.test.ts. |
| 3.4 | P0: Tokens and sessions have secure expiration, validation and revocation strategies. | Implemented | Verified Firebase claims and role/MFA checks; tests/backend.test.ts, tests/http.test.ts and tests/integration/firebase.test.ts. |
| 3.5 | P0: Service credentials use least-privilege permissions. | Partial / external gate | No live service account provisioned. Least-privilege IAM responsibilities documented; actual bindings require a project. |
| 3.6 | P1: Sensitive administrative actions require stronger authentication when appropriate. | Implemented | Verified Firebase claims and role/MFA checks; tests/backend.test.ts, tests/http.test.ts and tests/integration/firebase.test.ts. |
| 3.7 | P1: Login and recovery endpoints have abuse protections. | Partial / external gate | No local login/recovery endpoints. Firebase abuse/App Check provider settings require a configured project. |
| 3.8 | P1: Session cookies use Secure, HttpOnly and appropriate SameSite settings when cookies are used. | Not applicable | Bearer-token authentication only; no authentication cookies. |
| 3.9 | P1: Access control is tested against horizontal and vertical privilege escalation. | Implemented | Verified Firebase claims and role/MFA checks; tests/backend.test.ts, tests/http.test.ts and tests/integration/firebase.test.ts. |

## 4. Database and Data Integrity

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 4.1 | P0: Database queries use parameterized queries or safe query builders. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |
| 4.2 | P0: Important business invariants are enforced with database constraints and transactions. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |
| 4.3 | P0: Tenant isolation is enforced for every applicable database operation. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |
| 4.4 | P0: Database backups are automated and restoration has been tested. | Partial / external gate | Local backup creation and restoration tested. Automated cloud backup schedules and an isolated Firestore restore drill remain required. |
| 4.5 | P1: Indexes are designed for actual query patterns and verified with execution plans. | Not applicable | Foundation uses bounded aggregate point reads, not SQL/query scans. Payload indexing is disabled; no composite query plan to tune. |
| 4.6 | P1: Schema changes use versioned database migrations. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |
| 4.7 | P1: Transactions are intentionally scoped and do not remain open unnecessarily. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |
| 4.8 | P1: Connection pooling is configured and bounded. | Implemented | One reused Firebase Admin client/channel pool with bounded application concurrency; no unbounded client-per-request creation. |
| 4.9 | P1: Sensitive data is encrypted at rest where appropriate and in transit. | Partial / external gate | Local demo disk is unencrypted. Live managed TLS/at-rest/KMS configuration is not validated by emulators. |
| 4.10 | P1: Retention and deletion rules are implemented, including data in backups where feasible. | Partial / external gate | Raw-content expiration and purge endpoint implemented; deployment scheduling and backup deletion policies remain required. |
| 4.11 | P1: Concurrency conflicts are handled using locks, versioning or unique constraints. | Implemented | Tenant-scoped unit of work, schema v2 invariants and locked/transactional writes; repository integration tests and storage ADR. |

## 5. Application Security

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 5.1 | P0: Secrets and API keys are stored in a secrets manager or secured environment configuration. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.2 | P0: Production endpoints use HTTPS and secure transport settings. | Partial / external gate | Production API HSTS is implemented; managed HTTPS ingress must be configured and verified before deployment. |
| 5.3 | P0: Known injection vulnerabilities are mitigated, including SQL, command and template injection. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.4 | P0: User-controlled URLs and remote resource fetching are protected against SSRF. | Not applicable | No remote fetching of user-controlled or model-generated URLs exists. |
| 5.5 | P0: File uploads validate size, type, content and authorized access. | Implemented | Binary media is explicitly rejected until content inspection/storage authorization exists. Imported JSON rows are validated on the server. |
| 5.6 | P0: Rate limiting and resource limits protect against abuse. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.7 | P1: CORS is configured for specific allowed origins and credentials policies. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.8 | P1: CSRF protection is applied to vulnerable cookie-authenticated flows. | Not applicable | No cookie authentication. JSON mutations have strict origin checks. |
| 5.9 | P1: Dependencies, containers and infrastructure are scanned for vulnerabilities. | Partial / external gate | Dependency audit and local container scan pass; image scanning also runs in CI. Live infrastructure does not exist yet. See docs/evidence/validation.md for scope and scan filters. |
| 5.10 | P1: Security headers and safe error handling are configured where relevant. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.11 | P1: Audit logs capture security-sensitive actions without leaking secrets. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |
| 5.12 | P1: Threat modeling has been performed for high-risk workflows. | Implemented | Strict transport/security boundaries; lib/server and docs/operations/threat-model.md; automated abuse cases. |

## 6. Reliability and Resilience

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 6.1 | P0: External requests have explicit timeouts. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.2 | P0: Retries are bounded, use backoff and jitter, and target only retry-safe operations. | Implemented | Firestore transaction retries max 3; file-lock retries use bounded jitter/backoff; no unsafe/model retry loop. |
| 6.3 | P0: Duplicate requests and duplicate job delivery do not corrupt business state. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.4 | P0: Failures in external services do not cause uncontrolled cascading failures. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.5 | P1: Circuit breakers or equivalent isolation protect critical dependencies where warranted. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.6 | P1: Long-running work is moved to background processing rather than blocking HTTP requests. | Not applicable | No live long-running analytics/media/job integration is enabled; requests fail explicitly rather than running unbounded work. |
| 6.7 | P1: Queue workers support acknowledgments, retry policies and dead-letter handling. | Not applicable | No queue worker exists. ACK/retry/dead-letter behavior must be implemented before enabling durable jobs. |
| 6.8 | P1: Readiness and liveness health checks are configured. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.9 | P1: Graceful shutdown drains in-flight requests and workers. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.10 | P1: Recovery time and data loss objectives are defined for critical systems. | Implemented | Admission, deadlines, bounded SDK/lock retry, idempotency and explicit unavailable behavior; server tests and operations runbook. |
| 6.11 | P1: Disaster recovery procedures are documented and exercised. | Partial / external gate | Local restore drill passes; production Firestore recovery has not been exercised. |

## 7. Performance and Scalability

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 7.1 | P0: Expensive endpoints and database queries are measured under realistic load. | Partial / external gate | Measured 100-process local aggregate workload: 400 requests, 16 concurrent callers. Real Firestore/production workload remains unmeasured. |
| 7.2 | P0: Concurrency, memory and connection limits are configured to prevent exhaustion. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |
| 7.3 | P1: Appropriate caching is used with explicit expiration and invalidation. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |
| 7.4 | P1: N+1 queries and unnecessary repeated database calls are avoided. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |
| 7.5 | P1: Large response bodies and unnecessary serialization are minimized. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |
| 7.6 | P1: Capacity limits and autoscaling behavior are load-tested where applicable. | Partial / external gate | Local capacity envelope tested. Cloud autoscaling/load verification is outside the approved local/emulator scope. |
| 7.7 | P1: Asynchronous operations do not block event loops or exhaust worker pools. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |
| 7.8 | P1: Performance targets are defined for important endpoints using latency percentiles. | Implemented | Bounded tenant aggregate, DTOs, admission and paging; docs/evidence/local-load.json and capacity envelope in ADR. |

## 8. Logging, Monitoring and Observability

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 8.1 | P0: Unhandled failures are captured and alertable. | Implemented | Safe structured request/error/audit records plus admin per-process metrics; lib/server/observability.ts and hooks.ts. |
| 8.2 | P0: Logs do not expose passwords, access tokens or sensitive personal information. | Implemented | Safe structured request/error/audit records plus admin per-process metrics; lib/server/observability.ts and hooks.ts. |
| 8.3 | P1: Structured logs include request IDs or trace IDs. | Implemented | Safe structured request/error/audit records plus admin per-process metrics; lib/server/observability.ts and hooks.ts. |
| 8.4 | P1: Metrics cover request volume, latency, error rates and resource saturation. | Implemented | Safe structured request/error/audit records plus admin per-process metrics; lib/server/observability.ts and hooks.ts. |
| 8.5 | P1: Distributed tracing covers critical cross-service operations. | Partial / external gate | Request IDs correlate current operations; distributed tracing exporter and live cross-service spans are not configured. |
| 8.6 | P1: Alerts correspond to user impact and have actionable thresholds. | Partial / external gate | User-impact thresholds and response steps documented; actual alert delivery/recipients not configured. |
| 8.7 | P1: Dashboards show service health and key business operations. | Partial / external gate | Admin metrics endpoint implemented; hosted Cloud Monitoring dashboards not deployed. |
| 8.8 | P1: Incident runbooks and ownership or escalation paths are documented. | Partial / external gate | Incident runbooks written; named service/database/security owners and on-call escalation require organization action. |

## 9. Testing and Quality Assurance

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 9.1 | P0: Critical business logic has automated unit tests. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.2 | P0: Authorization, invalid inputs and critical failure paths have automated tests. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.3 | P0: Database transactions and persistence behavior have integration tests. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.4 | P1: API contract tests protect compatibility between services and consumers. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.5 | P1: End-to-end tests cover the most important user journeys. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.6 | P1: Load and stress testing validate production-like workloads. | Partial / external gate | Local bounded load evidence exists; production-like cloud stress remains pending. |
| 9.7 | P1: Security testing covers abuse cases and privilege escalation. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.8 | P1: Tests run automatically in CI and block regressions. | Partial / external gate | CI workflow added. Remote check results and required branch-protection settings must be verified after pushing. |
| 9.9 | P1: Test environments use isolated credentials and safe test data. | Implemented | Unit, HTTP/security, persistence, AI-boundary, browser and real Firebase emulator suites; isolated temporary data. |
| 9.10 | P1: Mocks and test fixtures do not conceal important provider or integration failures. | Implemented | Actual Auth/Firestore emulator adapters are tested; unavailable live providers never return mock success. |

## 10. CI/CD and Production Operations

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 10.1 | P0: Production deployments have an established rollback or recovery strategy. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.2 | P0: Environment and production secrets are never committed to source control. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.3 | P0: Database migrations have been evaluated for safe deployment and rollback behavior. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.4 | P1: CI runs tests, static checks, dependency checks and build validation. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.5 | P1: Production access follows least privilege and is audited. | Partial / external gate | No live production account or IAM policy is configured; emulator Admin SDK bypass is not a proof of least privilege. |
| 10.6 | P1: Staging reflects important production behavior and configurations. | Partial / external gate | Reproducible local emulator environment; production-like staging is not provisioned. |
| 10.7 | P1: Releases are traceable to code revisions and configuration versions. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.8 | P1: Canary or gradual deployments are available for riskier changes. | Partial / external gate | Zero-traffic/canary/rollback procedure documented, but no production revision routing exists. |
| 10.9 | P1: Infrastructure is reproducible through code where practical. | Implemented | CI, Dockerfile, locked dependencies, local migration/restore and documented rollback in docs/operations/runbook.md. |
| 10.10 | P1: Operational ownership, on-call response and maintenance processes are defined. | Partial / external gate | Runbooks and responsibilities documented; named operational owners/on-call and maintenance scheduling remain external. |

## 11. AI Model Integration and Lifecycle

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 11.1 | P0: AI providers are called through a backend-controlled interface, not with exposed client-side secrets. | Implemented | Backend-only guarded CaptureAdapter; strict limits and normalized failures; lib/server/ai.ts. |
| 11.2 | P0: Model inputs, outputs and usage are bounded by explicit application limits. | Implemented | Backend-only guarded CaptureAdapter; strict limits and normalized failures; lib/server/ai.ts. |
| 11.3 | P0: The backend defines what happens when the model or provider is unavailable. | Implemented | Backend-only guarded CaptureAdapter; strict limits and normalized failures; lib/server/ai.ts. |
| 11.4 | P1: Model names, versions and inference configurations are centrally managed. | Partial / external gate | Application limits are centralized; actual Gemini model/version/inference configuration awaits integration. |
| 11.5 | P1: Models can be changed without rewriting core business logic. | Implemented | Backend-only guarded CaptureAdapter; strict limits and normalized failures; lib/server/ai.ts. |
| 11.6 | P1: Provider errors are normalized into internal error types. | Implemented | Backend-only guarded CaptureAdapter; strict limits and normalized failures; lib/server/ai.ts. |
| 11.7 | P1: Inference requests are correlated with application traces and relevant configuration versions. | Partial / external gate | Application request correlation exists; no live inference usage/model-config trace exporter. |
| 11.8 | P1: Provider-specific data handling and retention settings are reviewed. | Pending integration | No provider receives data. Retention/training/data-processing terms must be reviewed before enabling a provider. |
| 11.9 | P1: Changes to models or prompts require evaluation before release. | Partial / external gate | Local adapter/security evaluation is versioned and runs in CI. Real model/prompt regression criteria still need provider integration. |

## 12. Prompt Injection and AI Security

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 12.1 | P0: All user prompts, uploaded documents, retrieved content and tool outputs are treated as untrusted input. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.2 | P0: Retrieved documents cannot override system-level application policies or authorization. | Not applicable | No RAG/retrieved document pipeline exists. |
| 12.3 | P0: Model-generated commands, SQL, URLs or arguments are validated before execution. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.4 | P0: Tool calls execute under backend-enforced user authorization and least privilege. | Not applicable | No model tools are registered or callable. |
| 12.5 | P0: Secrets and sensitive instructions are never trusted to remain hidden solely because they are in a system prompt. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.6 | P0: The model cannot independently authorize payments, privilege changes or destructive actions. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.7 | P1: Prompt injection attacks are included in automated adversarial test cases. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.8 | P1: Outbound model-driven network access uses SSRF and destination protections. | Not applicable | No model-driven network destinations or remote fetches exist. |
| 12.9 | P1: Responses are encoded or sanitized for the destination format to prevent XSS and injection. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |
| 12.10 | P1: Security policies are enforced in code, not solely through natural-language prompts. | Implemented | No model execution authority; strict candidate output and human review; adversarial AI and authorization tests. |

## 13. Structured Output and AI Validation

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 13.1 | P0: AI output is validated against an explicit schema before being trusted by backend services. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.2 | P0: Unsupported, malformed or missing fields are handled safely. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.3 | P0: AI-generated values are independently checked against domain rules. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.4 | P0: High-impact AI recommendations or actions have appropriate human review. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.5 | P1: Schema-constrained generation is used where the provider supports it. | Pending integration | No live provider is connected; request-side schema-constrained generation must be wired with that adapter. |
| 13.6 | P1: Response validation failures have bounded retry or fallback behavior. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.7 | P1: The application distinguishes verified facts from model-generated suggestions. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.8 | P1: Model uncertainty or inability to answer has an explicit user-facing state. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |
| 13.9 | P1: Model outputs cannot silently change authoritative records. | Implemented | Strict candidate output, provenance/duration/step invariants and fingerprint-checked commit; AI and application tests. |

## 14. RAG and Knowledge Retrieval

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 14.1 | P0: Retrieval enforces tenant, document and user-level permissions before context reaches the model. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.2 | P0: Deleted or revoked documents are excluded from future retrieval. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.3 | P0: Retrieved text is treated as data, never as trusted application instructions. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.4 | P1: Document ingestion validates file type, size and source. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.5 | P1: Chunks retain references to their source documents and versions. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.6 | P1: Retrieval relevance is tested using a representative query dataset. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.7 | P1: Document updates trigger appropriate re-indexing or invalidation. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.8 | P1: Citations or source references are available for answers that require factual grounding. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.9 | P1: Retrieval quality, freshness and context truncation are monitored. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |
| 14.10 | P1: Embedding model migrations and vector index compatibility are planned. | Not applicable | RAG is not implemented or enabled. Adding retrieval reopens tenant ACL, revocation, indexing and quality requirements. |

## 15. AI Agents and Tool Calling

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 15.1 | P0: Every tool has a strict allowlist of operations and parameter schema. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.2 | P0: Every tool action independently enforces the requesting user's permissions. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.3 | P0: Destructive, financial or irreversible actions require explicit approval when appropriate. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.4 | P0: Agent runs have limits on steps, time, tokens, spending and tool calls. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.5 | P0: Agent-generated requests are not allowed to bypass API validation. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.6 | P1: Tools use scoped credentials rather than broad administrative tokens. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.7 | P1: Tool execution is logged with actor, action, result and correlation ID. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.8 | P1: Duplicate tool calls are handled safely and idempotently where needed. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.9 | P1: Long-running agents support durable state and safe cancellation. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |
| 15.10 | P1: Partial failures have a reconciliation or recovery path. | Not applicable | Agent tools are not implemented or enabled. No model-generated command, query or remote URL is executed. |

## 16. AI Accuracy, Evaluation and Quality

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 16.1 | P0: A representative evaluation dataset exists for important model use cases. | Partial / external gate | Synthetic local capture/security cases exist; a representative live Gemini semantic-quality dataset is still required. |
| 16.2 | P0: Task success criteria are defined independently of the model's own judgment. | Implemented | Versioned synthetic local fixtures and independent action/order/schema assertions in tests/fixtures/capture-eval.v1.json and tests/ai.test.ts. |
| 16.3 | P0: Regression tests detect unacceptable changes after prompt or model updates. | Partial / external gate | Local adapter regressions are automated; no live model/prompt regression baseline is claimed. |
| 16.4 | P1: Evaluation includes factual accuracy, format compliance and task completion. | Partial / external gate | Local order/format/authority evaluated. Live factual accuracy and semantic task quality have not been measured. |
| 16.5 | P1: Adversarial, ambiguous and out-of-scope inputs are tested. | Implemented | Versioned synthetic local fixtures and independent action/order/schema assertions in tests/fixtures/capture-eval.v1.json and tests/ai.test.ts. |
| 16.6 | P1: RAG tests evaluate retrieval accuracy as well as answer groundedness. | Not applicable | No RAG retrieval or grounded-answer pipeline exists. |
| 16.7 | P1: Results are measured across different user groups and cases where fairness matters. | Pending integration | No real model/user-group evaluation dataset or fairness study. Worker rankings remain forbidden. |
| 16.8 | P1: Human reviewers audit a sample of outputs for important workflows. | Pending integration | Human SOP approval exists; organizational model-quality sampling and audit procedures are not established. |
| 16.9 | P1: Model quality and failure patterns are monitored over time. | Pending integration | No live model quality/failure monitoring without an enabled provider. |
| 16.10 | P1: Evaluation datasets are versioned, protected and kept separate from training where appropriate. | Implemented | Versioned synthetic local fixtures and independent action/order/schema assertions in tests/fixtures/capture-eval.v1.json and tests/ai.test.ts. |

## 17. AI Privacy and Data Governance

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 17.1 | P0: Sensitive data sent to AI providers is minimized and allowed by applicable data policies. | Implemented | Provider calls are disabled; tenant-scoped storage, safe logs, HMAC references, input minimization and explicit demo notices. |
| 17.2 | P0: Users and tenants cannot retrieve or infer another tenant's prompts, files or outputs. | Implemented | Provider calls are disabled; tenant-scoped storage, safe logs, HMAC references, input minimization and explicit demo notices. |
| 17.3 | P0: Provider training usage, retention and data processing terms are understood and approved. | Pending integration | Provider legal/data-processing terms are not presumed approved. No live provider is enabled. |
| 17.4 | P0: Prompt, completion, trace and cache storage respect retention and deletion policies. | Partial / external gate | Expiry and purge implemented for raw captures/imports; production scheduler and backup deletion policy pending. |
| 17.5 | P1: Personal information is redacted or pseudonymized when appropriate. | Implemented | Tenant-keyed HMAC plus basic contact redaction. Regex redaction is not complete DLP or anonymization. |
| 17.6 | P1: Users are informed when AI processing materially affects their data or decisions. | Implemented | Provider calls are disabled; tenant-scoped storage, safe logs, HMAC references, input minimization and explicit demo notices. |
| 17.7 | P1: Access to AI logs, datasets and traces is restricted. | Implemented | Provider calls are disabled; tenant-scoped storage, safe logs, HMAC references, input minimization and explicit demo notices. |
| 17.8 | P1: Applicable privacy and sector-specific legal requirements are reviewed. | Pending integration | Privacy/sector-specific legal review requires the organization and actual deployment context. |
| 17.9 | P1: Third-party model and data supply chains are reviewed for security and licensing risks. | Partial / external gate | Pinned dependencies/actions and scans exist; actual provider licensing/data-supply-chain review remains pending. |

## 18. AI Cost and Performance Management

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 18.1 | P0: Per-user, per-tenant and global spending limits or quotas protect against runaway usage. | Implemented | Live spending is zero because the production adapter is disabled. User/tenant inference quotas and bounded slots apply to future adapters. |
| 18.2 | P0: Maximum input size, output tokens and execution time are bounded. | Implemented | No paid provider can execute. Guarded input/output/deadline limits, durable user/tenant call quotas and per-process provider slots. |
| 18.3 | P0: Provider rate limits and quota exhaustion are handled gracefully. | Implemented | No paid provider can execute. Guarded input/output/deadline limits, durable user/tenant call quotas and per-process provider slots. |
| 18.4 | P1: Token usage and estimated cost are tracked by feature, model and tenant. | Not applicable | No live provider or billable token usage; cost attribution must be added when a provider is enabled. |
| 18.5 | P1: Models are selected by task complexity, evaluation results and cost. | Pending integration | No live model selection or cost/quality evaluation yet. |
| 18.6 | P1: Prompt and retrieval context sizes are minimized without compromising quality. | Implemented | No paid provider can execute. Guarded input/output/deadline limits, durable user/tenant call quotas and per-process provider slots. |
| 18.7 | P1: Caching is used only when safe for the data and user context. | Implemented | No paid provider can execute. Guarded input/output/deadline limits, durable user/tenant call quotas and per-process provider slots. |
| 18.8 | P1: Queues and concurrency limits manage bursts of inference demand. | Implemented | No paid provider can execute. Guarded input/output/deadline limits, durable user/tenant call quotas and per-process provider slots. |
| 18.9 | P1: Performance metrics distinguish time-to-first-token and end-to-end completion time. | Pending integration | No streaming inference; provider TTFT/end-to-end performance measurements await integration. |
| 18.10 | P1: Budgets and cost anomalies generate actionable alerts. | Pending integration | No provider billing account enabled. Cloud budget/cost alerts remain a deployment prerequisite. |

## 19. AI Operational Resilience

| ID | Requirement | Status | Evidence / remaining action |
| --- | --- | --- | --- |
| 19.1 | P0: An upstream provider outage does not corrupt application state. | Implemented | Fail-closed AI boundary preserves draft state; no silent fallback, model tools or authoritative writes; incident runbook. |
| 19.2 | P0: Fallback paths are safe and do not silently change critical semantics. | Implemented | Fail-closed AI boundary preserves draft state; no silent fallback, model tools or authoritative writes; incident runbook. |
| 19.3 | P0: Timed-out AI calls cannot cause duplicate high-impact tool actions. | Implemented | Fail-closed AI boundary preserves draft state; no silent fallback, model tools or authoritative writes; incident runbook. |
| 19.4 | P1: Provider fallback is tested with realistic failures and compatibility differences. | Not applicable | No alternate provider fallback exists. |
| 19.5 | P1: Streaming interruptions, client disconnects and cancellation are handled. | Partial / external gate | Provider abort/deadline implemented; no streaming inference. Client-disconnect cancellation awaits a live adapter. |
| 19.6 | P1: Asynchronous inference jobs support retries, status and reconciliation. | Not applicable | No asynchronous inference worker is enabled; future durable retries/status/reconciliation need implementation. |
| 19.7 | P1: Model changes can be rolled back without unexpected data incompatibility. | Partial / external gate | Rollback procedure and adapter boundary exist; no real model versions or compatibility fixtures have been evaluated. |
| 19.8 | P1: AI-specific dashboards cover latency, errors, refusals, validation failures and cost. | Pending integration | HTTP metrics only. No provider-quality/token-cost dashboard exists. |
| 19.9 | P1: Failure procedures cover provider outages, degraded quality and unsafe responses. | Implemented | Fail-closed AI boundary preserves draft state; no silent fallback, model tools or authoritative writes; incident runbook. |

## Summary

Implemented: 108, Not applicable: 34, Partial / external gate: 30, Pending integration: 11.

Remaining launch gates: live login/MFA provisioning, least-privilege IAM, managed transport/encryption checks, scheduled backups plus Firestore restore rehearsal, retention scheduling, named operational ownership and alerts, live performance/scale verification, and provider/legal/quality review before enabling AI/media/analytics/RAG/tools.
