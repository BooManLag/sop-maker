# GitHub Actions deploys with short-lived tokens; no service account keys exist.
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  depends_on                = [google_project_service.apis]
}
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.workflow"   = "assertion.workflow_ref"
  }
  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.repository_id == '${var.github_repository_id}' && assertion.ref == 'refs/heads/main'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  account_id   = "${var.app_name}-deploy"
  display_name = "${var.app_name} GitHub deployer"
  depends_on   = [google_project_service.apis]
}
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow/${var.github_repository}/.github/workflows/deploy.yml@refs/heads/main"
}
resource "google_project_iam_member" "deployer" {
  for_each = toset([
    "roles/run.developer",
    "roles/firebaserules.admin",
    "roles/datastore.indexAdmin",
    "roles/firebasehosting.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ])
  project = var.project_id
  role    = each.value
  member  = google_service_account.deployer.member
}
resource "google_artifact_registry_repository_iam_member" "deployer" {
  repository = google_artifact_registry_repository.images.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}
# Deploying a revision that runs as the runtime account requires acting as it, and nothing broader.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}

# Live model evals run from GitHub with an identity that can call Vertex AI and nothing else.
resource "google_service_account" "eval" {
  account_id   = "${var.app_name}-eval"
  display_name = "${var.app_name} model evals"
  depends_on   = [google_project_service.apis]
}
resource "google_service_account_iam_member" "eval_wif" {
  service_account_id = google_service_account.eval.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow/${var.github_repository}/.github/workflows/eval.yml@refs/heads/main"
}
resource "google_project_iam_member" "eval" {
  for_each = toset(["roles/aiplatform.user", "roles/serviceusage.serviceUsageConsumer"])
  project  = var.project_id
  role     = each.value
  member   = google_service_account.eval.member
}

# Terraform plans run from any infra.yml run (PRs, drift checks) with read-only access.
# Only this provider maps attribute.infra_plan, so tokens from the deploy provider can never match it.
resource "google_iam_workload_identity_pool_provider" "infra_plan" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-infra-plan"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.infra_plan" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.repository_id == '${var.github_repository_id}' && assertion.workflow_ref.startsWith('${var.github_repository}/.github/workflows/infra.yml@')"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
resource "google_service_account" "planner" {
  account_id   = "${var.app_name}-tf-plan"
  display_name = "${var.app_name} Terraform planner"
  depends_on   = [google_project_service.apis]
}
resource "google_service_account_iam_member" "planner_wif" {
  service_account_id = google_service_account.planner.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.infra_plan/${var.github_repository}"
}
resource "google_project_iam_member" "planner" {
  for_each = toset(["roles/viewer", "roles/iam.securityReviewer"])
  project  = var.project_id
  role     = each.value
  member   = google_service_account.planner.member
}
# The state bucket is bootstrapped outside Terraform (see README); its name follows that convention.
resource "google_storage_bucket_iam_member" "planner_state" {
  bucket = "${var.project_id}-tfstate"
  role   = "roles/storage.objectViewer"
  member = google_service_account.planner.member
}
resource "google_billing_account_iam_member" "planner" {
  count              = var.billing_account == "" ? 0 : 1
  billing_account_id = var.billing_account
  role               = "roles/billing.viewer"
  member             = google_service_account.planner.member
}

# Terraform applies run only from infra.yml on main, after production approval.
resource "google_service_account" "applier" {
  account_id   = "${var.app_name}-tf-apply"
  display_name = "${var.app_name} Terraform applier"
  depends_on   = [google_project_service.apis]
}
resource "google_service_account_iam_member" "applier_wif" {
  service_account_id = google_service_account.applier.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow/${var.github_repository}/.github/workflows/infra.yml@refs/heads/main"
}
resource "google_project_iam_member" "applier" {
  project = var.project_id
  role    = "roles/owner"
  member  = google_service_account.applier.member
}
resource "google_billing_account_iam_member" "applier" {
  count              = var.billing_account == "" ? 0 : 1
  billing_account_id = var.billing_account
  role               = "roles/billing.costsManager"
  member             = google_service_account.applier.member
}
