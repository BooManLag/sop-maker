locals {
  apis = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudtrace.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "identitytoolkit.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sts.googleapis.com",
  ]
  allowed_origins = length(var.allowed_origins) > 0 ? var.allowed_origins : [
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

resource "google_firebase_project" "default" {
  provider   = google-beta
  project    = var.project_id
  depends_on = [google_project_service.apis]
}

# Location is permanent. Deleting the stack abandons the database instead of destroying data.
resource "google_firestore_database" "default" {
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"
  deletion_policy         = "ABANDON"
  depends_on              = [google_project_service.apis]
}

resource "google_artifact_registry_repository" "images" {
  repository_id = var.app_name
  location      = var.region
  format        = "DOCKER"
  # Keep storage cost flat: only recent images survive.
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions { keep_count = 10 }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition { older_than = "2592000s" }
  }
  depends_on = [google_project_service.apis]
}

resource "random_password" "pseudonym_key" {
  length  = 48
  special = false
}
resource "google_secret_manager_secret" "pseudonym_key" {
  secret_id = "${var.app_name}-pseudonym-key"
  replication {
    user_managed {
      replicas { location = var.region }
    }
  }
  depends_on = [google_project_service.apis]
}
resource "google_secret_manager_secret_version" "pseudonym_key" {
  secret      = google_secret_manager_secret.pseudonym_key.id
  secret_data = random_password.pseudonym_key.result
}
