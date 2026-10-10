# Backend API v1

The machine-readable [OpenAPI contract](openapi.json) is generated from the same strict Zod request schemas used by the server. `npm run api:generate` updates it and `npm run api:check` detects drift. `/api/v1` is the canonical prefix; `/api` is a compatibility alias for the existing frontend. Additive optional fields are compatible within v1. Removing or changing a field requires v2 and a migration window.

All production data operations require `Authorization: Bearer <Firebase ID token>`. Firebase verifies signatures, audience/project, expiration, revocation and disabled users. Trusted custom claims must contain `organizationId` and `role` (`viewer`, `expert`, `reviewer`, `admin`). Only a separately controlled administrator sets these claims: there is no self-service role or membership endpoint. Every resource lookup happens inside that verified organization's namespace. Unknown and other-tenant IDs both return 404. Production writes require an `Idempotency-Key` of 16–128 safe characters. Reusing a key for another operation or body returns 409. Keys are scoped to the user and tenant and expire after 24 hours. Trials and proposals also have natural uniqueness rules.

Roles: viewers read; experts read and capture/import; reviewers additionally publish, dismiss/restore findings, plan trials and propose/submit changes; admins additionally read audit events and run retention. Review/admin operations require MFA and authentication within the last ten minutes by default. `GOOD_EXCEPTION_REQUIRE_MFA=false` is only used by local emulator tests. MFA registration and verified custom-claim provisioning must be configured before rollout.

Only the minimal health endpoints and CORS preflight are unauthenticated. `/health/live` and `/health/ready` return `{ "status": "ok" }`; readiness checks the selected repository. `/metrics` requires admin authorization and returns per-process counters, in-flight requests, RSS and p50/p95/p99 over the last 1,000 observations. Production aggregation belongs in Cloud Monitoring.

## Responses

- Process: `{id,title,equipment,currentVersion,versions}`. A version contains its structural steps, status, timestamps and `approved:boolean`. Private `organizationId` and `approvedBy` fields are not exposed.
- Capture creation: `{id,processId,kind,createdAt}`. Raw text and expert references are omitted.
- Scan creation: `{id,processId,demo,status,recordCount,createdAt}`. Raw records are never returned.
- Extraction: `{steps,questions,demo,notice}`; candidate steps only, never authoritative evidence or approvals.
- Findings, trials and changes retain their domain shapes in `lib/domain.ts`, within the caller's organization. Source IDs are evidence references, not worker scorecards.
- Collection GETs: `{items,nextCursor,total}`. `limit` defaults to 50, maximum 100; `cursor` is an offset, `sort` sorts by ID, and `status` is an exact filter. Offsets are not snapshot-consistent across concurrent mutations.
- `/workspace` caps each collection at 50 and includes `hasMore` flags; clients use collection endpoints beyond that.
- Error: `{error:string,code:string,requestId:string}`. Codes distinguish invalid input, authentication, authorization, conflict, capacity/rate limits, unavailable integrations and internal failure. No provider messages or stack traces are returned.

POST creates return 201 (including idempotent replays); other successful operations return 200. All API responses use `Cache-Control: no-store`, a generated request ID and API version header. Replays are subject to current authentication and authorization. Only exact configured CORS origins are allowed. Authentication uses bearer tokens, never cookies; there are no local password, login or recovery endpoints.

## Limits and unsupported operations

JSON bodies are streamed with a 1 MB limit even without Content-Length; maximum depth is 12 and maximum JSON nodes 25,000. Only JSON without content encoding is accepted. Unknown fields, prototype keys, invalid path IDs and duplicate query parameters are rejected. A capture is limited to 20,000 characters, each process to 100 steps, and imports to 1,000 rows. CSV/XLSX parsing remains in the browser, while the backend validates every resulting row. Binary media uploads are explicitly rejected until an authenticated, content-inspecting storage pipeline exists.

Production never seeds sample data or accepts sample scans, sample extraction, illustrative trial results or fake technician explanations. The real Gemini, analytics, messaging and trial allocation adapters remain unavailable. Their endpoints fail explicitly rather than fabricating successful evidence. The browser still demonstrates the local loop without Firebase login UI; connecting that UI is a separate frontend integration.

Default quotas: 32 in-flight requests per process, 120 requests/minute per actor per process, 40 successful writes/minute per actor and 200/tenant (durable), 20 extraction attempts/hour per actor and 100/tenant (durable). Provider slots remain occupied until an underlying timed-out call finishes, and invalid outputs never commit. Request keys make unknown-commit retries safe. Use the same key when retrying 503/429 responses, respect Retry-After, and do not retry 4xx validation/authorization failures.
