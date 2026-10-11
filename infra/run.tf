resource "google_service_account" "runtime" {
  account_id   = "${var.app_name}-run"
  display_name = "${var.app_name} Cloud Run runtime"
}

# Least privilege: Firestore data, Gemini calls, telemetry. No admin or IAM roles.
resource "google_project_iam_member" "runtime" {
  for_each = toset([
    "roles/datastore.user",
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
  deletion_protection = false

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80
    # Scan analysis runs inside a Cloud Tasks request for up to four minutes.
    timeout = "300s"
    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }
    containers {
      # Placeholder until CI deploys the first real image; CI owns the image afterwards.
      image = "us-docker.pkg.dev/cloudrun/container/hello"
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1", memory = "1Gi" }
        cpu_idle          = true
        startup_cpu_boost = true
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOD_EXCEPTION_ALLOWED_ORIGINS"
        value = join(",", local.allowed_origins)
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
      client,
      client_version,
    ]
  }
  depends_on = [
    google_project_iam_member.runtime,
    google_secret_manager_secret_iam_member.runtime,
    google_secret_manager_secret_version.pseudonym_key,
  ]
}

# The API authenticates every request with Firebase bearer tokens, so the service itself is public.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
