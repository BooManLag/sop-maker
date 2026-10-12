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
