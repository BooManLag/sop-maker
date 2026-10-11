# Scan analysis runs in the background: the API enqueues, Cloud Tasks calls the worker endpoint.
locals {
  # Cloud Run's deterministic URL, known before the service exists.
  worker_url = "https://${var.app_name}-${data.google_project.this.number}.${var.region}.run.app/api/v1/internal/analysis"
}

resource "google_cloud_tasks_queue" "analysis" {
  name     = "${var.app_name}-analysis"
  location = var.region
  # Caps concurrent Gemini agent runs, which caps model spend under load.
  rate_limits {
    max_concurrent_dispatches = 2
    max_dispatches_per_second = 1
  }
  # Must match ANALYSIS_MAX_ATTEMPTS in lib/server/http.ts.
  retry_config {
    max_attempts  = 3
    min_backoff   = "30s"
    max_backoff   = "300s"
    max_doublings = 2
  }
  depends_on = [google_project_service.apis]
}

# Identity Cloud Tasks signs worker requests as; the app accepts only this account.
resource "google_service_account" "tasks" {
  account_id   = "${var.app_name}-tasks"
  display_name = "${var.app_name} Cloud Tasks invoker"
}
resource "google_cloud_tasks_queue_iam_member" "runtime_enqueue" {
  name     = google_cloud_tasks_queue.analysis.name
  location = var.region
  role     = "roles/cloudtasks.enqueuer"
  member   = google_service_account.runtime.member
}
# Creating a task with an OIDC token requires acting as the invoker account.
resource "google_service_account_iam_member" "runtime_acts_as_tasks" {
  service_account_id = google_service_account.tasks.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.runtime.member
}
