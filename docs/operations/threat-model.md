# Foundation threat model

Trust boundaries: browser -> HTTP controller -> verified Firebase actor -> tenant repository -> Firestore; separately, untrusted captured text -> model adapter -> validated candidate draft -> human review. The model has no tools or database capability.

| Threat | Enforced control | Evidence / limitation |
| --- | --- | --- |
| Guess another tenant's resource IDs | Verified organization claim selects repository namespace before lookup | Unit + Firebase emulator tests return 404; no tenant selector in request bodies |
| Self-assign reviewer/admin | Strict schemas; trusted custom claims only; permission matrix | Viewer/expert escalation tests; claims provisioning is external |
| Stolen/expired/disabled-user tokens | Admin SDK verifies revocation, expiration, issuer/audience and disabled status | Emulator disabled-user test; actual production certificate handling is delegated to Firebase |
| CSRF / hostile websites | Bearer auth, exact CORS origins, JSON-only mutations, cross-site origin checks | HTTP tests; no auth cookies |
| Prototype, SQL, shell or template injection | Strict schemas; no eval/shell/SQL interpolation or raw HTML rendering | Adversarial tests; all Firestore paths use validated IDs |
| Prompt injection changes an SOP or sends data out | Text is untrusted; model has no execution tools; strict output allowlist; explicit human approval | Adversarial output and unchanged-baseline tests |
| Fake statistical evidence | Live analytics unavailable; production disallows sample results; model cannot emit outcome fields | Domain/output tests; real analysis remains an integration task |
| Duplicate creates, unknown-commit retries | Actor/tenant-scoped request keys and transactional replay; natural trial/change uniqueness | Concurrent local and Firestore tests |
| Lost updates during model processing | Extract outside transaction; compare draft fingerprint on commit | Concurrency test; invalid/timed-out output never commits |
| Resource exhaustion | Stream byte/depth/node limits; bounded rows/steps/state; admission, quotas, timeouts, circuit isolation | Abuse tests and local load evidence; cloud autoscaling not tested |
| Stored-media malware / SSRF | Binary uploads are rejected; no user-controlled URL fetching | Media extension alone never authorizes ingestion |
| Sensitive data in errors/logs | Safe errors, allowlisted log fields, HMAC technician references, raw input limits | Logging/privacy tests; free-text regex redaction is not a DLP guarantee |
| Local concurrent writers or partial crash writes | Cross-process lease lock, temp+fsync+rename, revisions and invariants | Persistence rollback/reopen tests; local disks remain a demo-only trust boundary |
| Silent data destruction or capacity overflow | Invariants, immutable baseline, explicit retention/reset, hard capacity errors | Domain and backup tests; deployed backup schedule/restore still required |

Residual limitations: no live media or provider integrations, no production approval UI/auth UI, no production IAM/retention/monitoring deployment, and a 750 KB per-tenant aggregate limit. CORS and Firestore rules do not replace Admin SDK tenant authorization. Regex redaction cannot reliably detect names or all personal data; users must supply sanitized walkthroughs/notes. Real AI data-processing terms, legal review and security ownership are required before connecting a paid provider.
