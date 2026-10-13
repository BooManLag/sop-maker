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
5. Set up Firebase Authentication: enable the Google provider, upgrade to Identity Platform and enable **TOTP** multi-factor authentication, and add the Hosting domain to the authorized domains. Set trusted `organizationId`/`role` custom claims for each user. The browser loads its web config from Hosting's `/__/firebase/init.json`, signs in with Google, asks for the authenticator code when one is enrolled, and lets signed-in people enrol one (reviewers and admins need it). Verify tenant isolation and the complete authenticated workflow before allowing customer traffic. Configure backups, retention scheduling and real alert recipients separately.
6. Copy `github_variables` outputs to repository variables. Create a protected `production` GitHub environment with the appropriate reviewers and branch restrictions; create `model-evaluation` separately for paid manual evals. Workload federation checks the numeric repository ID and `main`, with distinct workflow-specific bindings for the deployer and eval identities.
7. Enable infrastructure CI/CD (see below).
8. Set repository variable `DEPLOY_ENABLED=true` only after the prerequisites are complete. Leaving it absent or false skips automatic deployment. Merging this branch alone does not enable releases.

## Infrastructure CI/CD

`.github/workflows/infra.yml` replaces manual applies after a one-time bootstrap:

- **Every PR touching `infra/`:** format, validate, mocked `terraform test`, Trivy config scan, then `terraform plan` against the real project as the read-only planner (`-lock=false`). The plan is posted as one PR comment, updated on each push. Fork PRs get no credentials.
- **Merge to `main`:** plan again, encrypt the saved plan, and pause the apply job for `production` approval. The applier applies exactly that plan; Terraform refuses it if state changed since planning. Applies share the `deploy-production` concurrency group with app releases.
- **Daily:** a scheduled plan fails if live infrastructure drifted from `main`.

Identities (all short-lived via Workload Identity Federation, no keys):

| Identity | Trusted workflow | Access |
|---|---|---|
| `<app>-tf-plan` | `infra.yml`, any ref, via the `github-infra-plan` provider | `roles/viewer`, `roles/iam.securityReviewer`, state bucket read, `roles/billing.viewer` |
| `<app>-tf-apply` | `infra.yml` on `main` only | `roles/owner`, `roles/billing.costsManager` when `billing_account` is set |

The planner provider maps only `attribute.infra_plan`, so its tokens can never match the deployer, eval or applier bindings (tested in `tests/safety.tftest.hcl`).

**One-time bootstrap:**

1. Apply this configuration once locally as a project owner who is also a billing account administrator, so the CI identities exist.
2. Copy the new `github_variables` outputs (`WIF_INFRA_PLAN_PROVIDER`, `TF_PLANNER_SA`, `TF_APPLIER_SA`) to repository variables.
3. Mirror `prod.tfvars` into repository variables: `TF_INITIAL_IMAGE`, and `TF_BILLING_ACCOUNT` / `TF_BILLING_CAP_ENABLED` if used. Any other non-default variable needs a matching `TF_VAR_*` entry in `infra.yml`, or CI plans will show it as a change.
4. Create a random repository secret `TF_PLAN_KEY` (for example `openssl rand -base64 32`). Saved plans contain state values, so they are encrypted as artifacts.
5. Set `INFRA_CD_ENABLED=true`. From then on, change infrastructure only through PRs.

**Known risk:** the planner can read state, which contains the generated HMAC secret, so any same-repository PR could expose it through a modified workflow. That is acceptable while only trusted collaborators can push branches. The long-term fix is to generate that key outside Terraform state.

## Release and recovery

After `Backend verification` succeeds for a push to `main`, the opted-in release job checks that the source is still the latest main revision, builds and scans an image **before** creating temporary cloud credentials, pushes it, and deploys its digest with no production traffic. It checks readiness and verifies that an unauthenticated workspace request returns 401. It generates Hosting rewrites from `APP_NAME` and `GCP_REGION`, deploys rules/indexes/Hosting, and then sends traffic to the verified revision. A failing pre-promotion check leaves existing revision traffic unchanged. After promotion, the live URL is checked again; if readiness or the 401 check fails, traffic returns to the previously serving revision and the job fails. These smoke checks do not replace an authenticated user acceptance test.

A production environment approval is a GitHub configuration requirement; adding `environment: production` alone does not create reviewers. Branch protection and environment protection must be configured in GitHub. Workload Identity Federation permission changes must be applied before the revised workflows can authenticate.

Retain the previous revision name and image digest. Roll back application traffic with `gcloud run services update-traffic <service> --to-revisions <previous>=100 --region <region> --project <project>`. Firestore rules/indexes and Hosting are separate deployment steps, not an atomic transaction; review their backward compatibility and restore the prior Firebase configuration separately when needed. Database deletion protection stays enabled. See [the operations runbook](../docs/operations/runbook.md) for data recovery limitations.

## Budget notifications and optional shutoff

A budget is **not a hard spending ceiling**. Billing data and Pub/Sub notifications are delayed, so spend can exceed the amount even when automatic shutoff is enabled. Default `billing_cap_enabled=false` logs the threshold without billing API calls or granting the function billing-project-manager privileges.

Explicit opt-in grants the ability to unlink billing for the entire project. This can stop the app, disrupt access to resources and require manual recovery. The function checks the expected topic, budget name, currency, positive configured amount and current Pacific calendar-month interval. It rejects malformed/stale notifications, uses bounded API timeouts, and tolerates repeated deliveries when billing is already disabled. After a shutoff, disable the automatic mechanism before manually relinking billing, or another current-period notification can stop it again. Test delivery in dry-run mode before considering opt-in.

The function's dependency lockfile is committed. Its scoped `cloudevents` override uses CommonJS-compatible `uuid` 11.1.1 to address GHSA-w5hq-g745-h8pq while upstream still requests vulnerable uuid 8.x; re-evaluate this override on framework upgrades.

## Terraform on Windows with Smart App Control

The official Terraform Docker image avoids locally blocked provider executables. Use a Docker volume for provider data, the same 1.16.5 version as CI, and supported short-lived gcloud credentials. Never store credentials, Terraform state, `.tfvars`, plan files or `gha-creds-*.json` in Git or container images. `.dockerignore` excludes those paths.
