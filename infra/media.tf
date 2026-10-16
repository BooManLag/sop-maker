# Recordings and step frames. The browser PUTs through signed URLs; only the runtime reads them.
resource "google_storage_bucket" "media" {
  name                        = "${var.project_id}-media"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Raw recordings and unpublished frames expire with the 30-day raw-content rule. Published
  # frames are moved out of these prefixes, so the rule never reaches them.
  lifecycle_rule {
    condition {
      age            = 30
      matches_prefix = ["quarantine/", "clean/"]
    }
    action {
      type = "Delete"
    }
  }
  # A deleted recording must not stay restorable past the 30-day promise.
  soft_delete_policy {
    retention_duration_seconds = 0
  }
  cors {
    origin          = local.allowed_origins
    method          = ["PUT", "GET"]
    response_header = ["Content-Type", "x-goog-content-length-range"]
    max_age_seconds = 3600
  }
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket_iam_member" "runtime_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.runtime.member
}
# Gemini reads recordings by gs:// URI as the Vertex AI service agent, not as the caller.
resource "google_storage_bucket_iam_member" "vertex_reads_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-aiplatform.iam.gserviceaccount.com"
}

# Signed URLs are signed by the runtime account itself through IAM signBlob.
resource "google_service_account_iam_member" "runtime_signs_urls" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = google_service_account.runtime.member
}
