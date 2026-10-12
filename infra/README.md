# Infrastructure

Terraform defines Cloud Run, Firestore, Vertex AI access, Cloud Tasks, Artifact Registry, Secret Manager, GitHub Workload Identity Federation, monitoring and an optional monthly budget. Firebase CLI owns rules, indexes and Hosting. Application source is under `src/`.

This branch was reviewed with local tests and mocked Terraform providers. No infrastructure was applied, no live model evaluation was run and no deployment was performed during that review. A real project plan, IAM verification and rollout remain necessary before production.

## Local validation

Use Terraform 1.16.5 (the CI version), Node 24 for the app and Node 22 for the separately deployed billing function:

```sh
terraform -chdir=infra init -backend=false -lockfile=readonly -input=false
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra validate
terraform -chdir=infra test
npm ci
npm run typecheck
npm test
npm run lint
npm run api:check
npm run build
```

Every provider in `infra/tests/safety.tftest.hcl` is mocked, including its simulated applies; these tests cannot contact Google Cloud. They test safe defaults, explicit billing shutoff opt-in, IAM boundaries and invalid limits. They do not verify real cloud permissions or quotas.

## First deployment prerequisites

1. Choose an existing billed project, region and permanent `app_name` (4–18 characters, allowing service-account suffixes). Firestore's location cannot be changed later. Get the immutable numeric repository ID from GitHub's repository API and populate `github_repository_id`.
2. Bootstrap the Cloud Resource Manager, Service Usage and Billing Budgets APIs, then create a private GCS state bucket with uniform access, public access prevention and versioning. Restrict state access: the generated HMAC secret is present in Terraform state. Initialize with `terraform init -backend-config="bucket=<project_id>-tfstate"` from `infra/`.
3. Copy `prod.tfvars.example` to ignored `prod.tfvars`. Build, scan and push the application image to Artifact Registry, then set `initial_image` to its immutable `@sha256:` reference. The first service revision needs a real app image for readiness probes; the generic Cloud Run hello image is unsuitable. If the registry does not exist yet, review a targeted bootstrap plan for `google_artifact_registry_repository.images` and its API dependencies, provision only that registry, then run the full plan after pushing the image. Supply the intended image reference for required-variable validation during bootstrap; do not deploy the service until the referenced image exists.
4. Review a full `terraform plan -var-file=prod.tfvars`, including IAM and database changes, before applying. The runtime requires Firebase user-read access for revoked/disabled-token checks. Application startup explicitly selects production mode, refuses incomplete Cloud Tasks configuration and uses HTTP startup/liveness probes. Existing installations should supply the currently verified app image as `initial_image`; Terraform leaves subsequent image changes to CI.
5. Set up Firebase Authentication, trusted organization/role claims and MFA. **The frontend still needs a production sign-in integration.** Verify tenant isolation and the complete authenticated workflow before allowing customer traffic. Configure backups, retention scheduling and real alert recipients separately.
6. Copy `github_variables` outputs to repository variables. Create a protected `production` GitHub environment with the appropriate reviewers and branch restrictions; create `model-evaluation` separately for paid manual evals. Workload federation checks the numeric repository ID and `main`, with distinct workflow-specific bindings for the deployer and eval identities.
7. Set repository variable `DEPLOY_ENABLED=true` only after the prerequisites are complete. Leaving it absent or false skips automatic deployment. Merging this branch alone does not enable releases.

## Release and recovery

After `Backend verification` succeeds for a push to `main`, the opted-in release job checks that the source is still the latest main revision, builds and scans an image **before** creating temporary cloud credentials, pushes it, and deploys its digest with no production traffic. It checks readiness and verifies that an unauthenticated workspace request returns 401. It generates Hosting rewrites from `APP_NAME` and `GCP_REGION`, deploys rules/indexes/Hosting, and then sends traffic to the verified revision. A failing pre-promotion check leaves existing revision traffic unchanged. These smoke checks do not replace an authenticated user acceptance test.

A production environment approval is a GitHub configuration requirement; adding `environment: production` alone does not create reviewers. Branch protection and environment protection must be configured in GitHub. Workload Identity Federation permission changes must be applied before the revised workflows can authenticate.

Retain the previous revision name and image digest. Roll back application traffic with `gcloud run services update-traffic <service> --to-revisions <previous>=100 --region <region> --project <project>`. Firestore rules/indexes and Hosting are separate deployment steps, not an atomic transaction; review their backward compatibility and restore the prior Firebase configuration separately when needed. Database deletion protection stays enabled. See [the operations runbook](../docs/operations/runbook.md) for data recovery limitations.

## Budget notifications and optional shutoff

A budget is **not a hard spending ceiling**. Billing data and Pub/Sub notifications are delayed, so spend can exceed the amount even when automatic shutoff is enabled. Default `billing_cap_enabled=false` logs the threshold without billing API calls or granting the function billing-project-manager privileges.

Explicit opt-in grants the ability to unlink billing for the entire project. This can stop the app, disrupt access to resources and require manual recovery. The function checks the expected topic, budget name, currency, positive configured amount and current Pacific calendar-month interval. It rejects malformed/stale notifications, uses bounded API timeouts, and tolerates repeated deliveries when billing is already disabled. After a shutoff, disable the automatic mechanism before manually relinking billing, or another current-period notification can stop it again. Test delivery in dry-run mode before considering opt-in.

The function's dependency lockfile is committed. Its scoped `cloudevents` override uses CommonJS-compatible `uuid` 11.1.1 to address GHSA-w5hq-g745-h8pq while upstream still requests vulnerable uuid 8.x; re-evaluate this override on framework upgrades.

## Terraform on Windows with Smart App Control

The official Terraform Docker image avoids locally blocked provider executables. Use a Docker volume for provider data, the same 1.16.5 version as CI, and supported short-lived gcloud credentials. Never store credentials, Terraform state, `.tfvars`, plan files or `gha-creds-*.json` in Git or container images. `.dockerignore` excludes those paths.
