resource "google_service_account" "runtime" {
  account_id   = "${var.app_name}-run"
  display_name = "${var.app_name} Cloud Run runtime"
  depends_on   = [google_project_service.apis]
}

# Least privilege: Firestore data, Gemini calls, telemetry. No admin or IAM roles.
resource "google_project_iam_member" "runtime" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.viewer",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent",
  ])
  project = var.project_id
  role    = each.value
  member  = google_service_account.runtime.member
}
resource "google_secret_manager_secret_iam_member" "runtime" {
  secret_id = google_secret_manager_secret.pseudonym_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.runtime.member
}

resource "google_cloud_run_v2_service" "app" {
  name                = var.app_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 16
    # Cloud Tasks requests run scan analysis and media transcription; a long video takes minutes.
    timeout = "900s"
    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }
    containers {
      # First apply requires a verified app image; CI owns subsequent revisions.
      image = var.initial_image
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1", memory = "1Gi" }
        cpu_idle          = true
        startup_cpu_boost = true
      }
      startup_probe {
        http_get { path = "/api/v1/health/ready" }
        period_seconds    = 10
        timeout_seconds   = 6
        failure_threshold = 24
      }
      liveness_probe {
        http_get { path = "/api/v1/health/live" }
        period_seconds  = 30
        timeout_seconds = 5
      }
      env {
        name  = "GOOD_EXCEPTION_MODE"
        value = "production"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOD_EXCEPTION_ALLOWED_ORIGINS"
        value = join(",", local.allowed_origins)
      }
      # Prototype: every signed-in user without membership claims joins one shared org as admin.
      env {
        name  = "GOOD_EXCEPTION_OPEN_ORGANIZATION"
        value = "prototype"
      }
      env {
        name  = "GOOD_EXCEPTION_OPEN_ROLE"
        value = "admin"
      }
      # Prototype: any role may create, rename and delete processes; set "true" to restore roles.
      env {
        name  = "GOOD_EXCEPTION_ROLES_ENFORCED"
        value = "false"
      }
      env {
        name  = "GOOD_EXCEPTION_GEMINI_MODEL"
        value = var.gemini_model
      }
      env {
        name  = "GOOD_EXCEPTION_AGENT_MODEL"
        value = var.agent_model == "" ? var.gemini_model : var.agent_model
      }
      env {
        name  = "GOOD_EXCEPTION_TASKS_QUEUE"
        value = google_cloud_tasks_queue.analysis.id
      }
      env {
        name  = "GOOD_EXCEPTION_WORKER_URL"
        value = local.worker_url
      }
      env {
        name  = "GOOD_EXCEPTION_TASKS_INVOKER"
        value = google_service_account.tasks.email
      }
      env {
        name  = "GOOD_EXCEPTION_MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.gemini_location
      }
      env {
        name = "GOOD_EXCEPTION_PSEUDONYM_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.pseudonym_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      # Service-level scaling is unset here; the API reports its defaults back.
      scaling,
      client,
      client_version,
    ]
  }
  depends_on = [
    google_project_iam_member.runtime,
    google_secret_manager_secret_iam_member.runtime,
    google_secret_manager_secret_version.pseudonym_key,
    google_storage_bucket_iam_member.runtime_media,
    google_service_account_iam_member.runtime_signs_urls,
  ]
}

# The API authenticates every request with Firebase bearer tokens, so the service itself is public.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
