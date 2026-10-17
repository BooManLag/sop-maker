# Optional delayed billing shutoff. Budget notifications are not a real-time spending ceiling.
# Defaults to dry run; explicitly opt in only after reviewing outage and recovery impact.
locals {
  cap = var.billing_account == "" ? 0 : 1
}

resource "google_pubsub_topic" "budget" {
  count      = local.cap
  name       = "${var.app_name}-budget"
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "functions_source" {
  count                       = local.cap
  name                        = "${var.project_id}-functions-src"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false
  depends_on                  = [google_project_service.apis]
}
data "archive_file" "billing_cap" {
  count       = local.cap
  type        = "zip"
  source_dir  = "${path.module}/functions/billing-cap"
  output_path = "${path.module}/.build/billing-cap.zip"
  excludes    = ["node_modules", ".gitignore"]
}
resource "google_storage_bucket_object" "billing_cap" {
  count  = local.cap
  name   = "billing-cap-${data.archive_file.billing_cap[0].output_md5}.zip"
  bucket = google_storage_bucket.functions_source[0].name
  source = data.archive_file.billing_cap[0].output_path
}

# Runs the function. Its only power is unlinking this project's billing.
resource "google_service_account" "billing_cap" {
  count        = local.cap
  account_id   = "${var.app_name}-billing-cap"
  display_name = "${var.app_name} billing hard cap"
  depends_on   = [google_project_service.apis]
}
# projectManager can unlink billing; browser lets it read the project's current billing info.
resource "google_project_iam_member" "billing_cap" {
  for_each = local.cap == 1 ? toset(concat(["roles/browser", "roles/eventarc.eventReceiver"], var.billing_cap_enabled ? ["roles/billing.projectManager"] : [])) : toset([])
  project  = var.project_id
  role     = each.value
  member   = google_service_account.billing_cap[0].member
}
moved {
  from = google_project_iam_member.billing_cap_manager[0]
  to   = google_project_iam_member.billing_cap["roles/billing.projectManager"]
}
# Delivers Pub/Sub messages to the function.
resource "google_cloud_run_service_iam_member" "billing_cap_invoker" {
  count    = local.cap
  location = var.region
  service  = google_cloudfunctions2_function.billing_cap[0].service_config[0].service
  role     = "roles/run.invoker"
  member   = google_service_account.billing_cap[0].member
}

# Builds the function image; new projects no longer grant this to the default compute account.
resource "google_service_account" "functions_build" {
  count        = local.cap
  account_id   = "${var.app_name}-fn-build"
  display_name = "${var.app_name} function builds"
  depends_on   = [google_project_service.apis]
}
resource "google_project_iam_member" "functions_build" {
  for_each = local.cap == 1 ? toset([
    "roles/cloudbuild.builds.builder",
    "roles/logging.logWriter",
    "roles/artifactregistry.writer",
    "roles/storage.objectViewer",
  ]) : toset([])
  project = var.project_id
  role    = each.value
  member  = google_service_account.functions_build[0].member
}

resource "google_cloudfunctions2_function" "billing_cap" {
  count    = local.cap
  name     = "${var.app_name}-billing-cap"
  location = var.region
  build_config {
    runtime         = "nodejs22"
    entry_point     = "capBilling"
    service_account = google_service_account.functions_build[0].id
    source {
      storage_source {
        bucket = google_storage_bucket.functions_source[0].name
        object = google_storage_bucket_object.billing_cap[0].name
      }
    }
  }
  service_config {
    max_instance_count    = 1
    available_memory      = "256M"
    timeout_seconds       = 60
    service_account_email = google_service_account.billing_cap[0].email
    environment_variables = {
      CAP_PROJECT_ID    = var.project_id
      CAP_DRY_RUN       = var.billing_cap_enabled ? "false" : "true"
      CAP_BUDGET_NAME   = "${var.app_name} monthly"
      CAP_BUDGET_AMOUNT = tostring(var.monthly_budget_usd)
      CAP_TOPIC         = google_pubsub_topic.budget[0].id
    }
  }
  event_trigger {
    trigger_region        = var.region
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.budget[0].id
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.billing_cap[0].email
  }
  depends_on = [google_project_iam_member.functions_build, google_project_iam_member.billing_cap, google_service_account_iam_member.budget_delivery_token]
}

# Billing sends notifications with this Google-managed identity, and grants it on the topic
# itself when a budget is linked; declaring it here keeps that grant managed.
resource "google_pubsub_topic_iam_member" "budget_publisher" {
  count  = local.cap
  topic  = google_pubsub_topic.budget[0].id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:billing-budget-alert@system.gserviceaccount.com"
}
resource "google_project_service_identity" "pubsub" {
  provider   = google-beta
  count      = local.cap
  service    = "pubsub.googleapis.com"
  depends_on = [google_project_service.apis]
}
resource "google_service_account_iam_member" "budget_delivery_token" {
  count              = local.cap
  service_account_id = google_service_account.billing_cap[0].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_project_service_identity.pubsub[0].email}"
}
