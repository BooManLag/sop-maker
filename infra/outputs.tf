# Copy these into GitHub repository variables (Settings → Secrets and variables → Actions → Variables).
output "github_variables" {
  value = {
    GCP_PROJECT_ID   = var.project_id
    GCP_REGION       = var.region
    APP_NAME         = var.app_name
    WIF_PROVIDER     = google_iam_workload_identity_pool_provider.github.name
    DEPLOYER_SA      = google_service_account.deployer.email
    RUNTIME_SA       = google_service_account.runtime.email
    IMAGE_REPOSITORY = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
  }
}
output "service_url" {
  value = google_cloud_run_v2_service.app.uri
}
