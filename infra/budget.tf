data "google_project" "this" {}

# Emails billing admins at 50/90/100%, and publishes every update to the optional delayed shutoff function (billing-cap.tf).
resource "google_billing_budget" "monthly" {
  count           = var.billing_account == "" ? 0 : 1
  billing_account = var.billing_account
  display_name    = "${var.app_name} monthly"
  budget_filter {
    calendar_period = "MONTH"
    projects        = ["projects/${data.google_project.this.number}"]
  }
  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget_usd)
    }
  }
  dynamic "threshold_rules" {
    for_each = [0.5, 0.9, 1.0]
    content { threshold_percent = threshold_rules.value }
  }
  all_updates_rule {
    pubsub_topic                   = google_pubsub_topic.budget[0].id
    disable_default_iam_recipients = false
  }
  depends_on = [google_project_service.apis, google_pubsub_topic_iam_member.budget_publisher]
}

# Destination for the Cloud Billing export, which shows spend by service and SKU. The export itself
# has no API: turn on "Detailed usage cost" in Billing > Billing export and pick this dataset.
resource "google_bigquery_dataset" "billing_export" {
  count       = var.billing_account == "" ? 0 : 1
  dataset_id  = "billing_export"
  location    = var.region
  description = "Cloud Billing detailed usage cost export."
  depends_on  = [google_project_service.apis]
}
