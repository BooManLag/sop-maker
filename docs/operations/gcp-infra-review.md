# GCP infrastructure branch review

Completed 2026-10-13. Branch: `feat/gcp-infra`. Reviewed branch tip `09d1626` and integrated `main` at `fc742dc`, preserving the new `src/` structure, service boundaries, UI and video/PPTX/PDF planning document. All merge conflicts were resolved.

## Changes made

- Carried the Vertex AI, ADK and Cloud Tasks integrations into the reorganized source and test directories, retaining scan polling and non-demo scan states.
- Added Firebase Authentication read access needed for revoked/disabled-token verification, explicit production mode, service deletion protection, readiness/liveness probes and lower Cloud Run concurrency. Initial provisioning requires a verified application image digest instead of a generic hello container.
- Restricted GitHub federation by immutable repository ID, branch and separate deploy/eval workflow bindings. Deployment requires explicit repository opt-in and a protected production environment, rejects superseded revisions, scans the exact release image, stages without traffic, checks readiness and unauthenticated access denial, and only then promotes the revision. Hosting configuration follows the selected service/region.
- Excluded temporary deployment credentials, Terraform state/variables/plans and nested dependency directories from Docker context.
- Made incomplete Cloud Tasks configuration fail startup. Cloud Run AI analysis requires a durable queue; emulator configuration rejects live model calls. Capture requests now have enough HTTP time for the configured AI deadline.
- Changed automatic billing shutoff to explicit opt-in; dry run has no billing-project-manager role. Added budget publisher and event delivery IAM, bounded API requests, strict notification validation and Pacific calendar-month handling. Committed the function lockfile and a scoped, tested uuid security override.
- Added offline Terraform regression tests, infrastructure CI checks and lint enforcement. Fixed a publishing race discovered in browser testing: navigation now runs before cache invalidation can unmount the review form.

## Validation

Checks executed locally on 2026-10-12:

| Check | Result |
| --- | --- |
| Application tests | 72 passed, zero failed/skipped; focused cache/navigation regression passed after the UI fix |
| Firebase Auth / Firestore integration | 3 passed using the demo project and emulators |
| Playwright | All 4 workflows passed, including publishing, scan/trial/change flow, insufficient-data rejection and phone navigation |
| Terraform | Format, provider-schema validation and 4 mocked-provider scenarios passed; no real apply or cloud plan |
| TypeScript, Next.js production build, Prettier, ESLint, OpenAPI drift | Passed |
| GitHub Actions workflow validation | actionlint 1.7.12 passed |
| Production dependency audits | Zero advisories in app production dependencies and billing-function dependencies |
| Billing Functions Framework smoke | A dry-run CloudEvent returned 204 without calling billing APIs |
| Docker | Final image builds, runs as `node`, and serves readiness and workspace data in explicit local demo mode |
| Container scan | Trivy 0.75.0 found zero HIGH/CRITICAL vulnerabilities with available fixes; lower-severity/unfixed issues are outside this gate |

Scanned image ID: `sha256:69d6c8dd2795f021aea1e54325ef0ed0834eeea2473e21cdd4e275db38c60bae`. Dependency and container results are time-specific; CI reruns them for the pushed revision. Live provider behavior, project permissions and deployment were not validated.

## Follow-up steps before production

1. Configure a real project and review the actual Terraform plan, resource quotas, region/model availability and existing-resource imports. Set the required repository ID and initial image variables; existing installations must review the changed IAM and deletion protections.
2. Complete frontend Firebase sign-in, trusted claims/MFA provisioning and an authenticated end-to-end acceptance test. Keep `DEPLOY_ENABLED` unset until these gates are satisfied. Configure GitHub environment reviewers and required branch checks; workflow YAML alone does not enforce those settings.
3. Validate Cloud Tasks delivery, redelivery and failure recovery with real IAM. The existing scan pipeline still needs a durable outbox/dispatch reconciliation and worker leases before relying on crash recovery and duplicate-delivery cost control; it is not a transactionally atomic database-plus-queue operation.
4. Run explicitly authorized live model evaluations, verify provider timeouts/cancellation and set measured inference budgets. Offline deterministic tests do not establish model quality or live throughput.
5. Configure cloud backups/restore drills, retention scheduling and alert delivery to real responders. The existing dashboard is configured with `ignore_changes`; dashboard changes currently require an explicit replacement as documented in `infra/monitoring.tf`.
6. Test budget delivery in dry-run mode. Budget events are delayed, not a guaranteed spending ceiling. Unlinking billing affects the entire project; review outage/recovery impact before enabling it.

See [infra/README.md](../../infra/README.md) for configuration, release sequencing and rollback instructions. No cloud resources were applied or deployed during this review.
