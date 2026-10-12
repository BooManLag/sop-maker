data "google_project" "this" {}

# Emails billing admins at 50/90/100%, and publishes every update to the hard-cap function (billing-cap.tf).
resource "google_billing_budget" "monthly" {
  count           = var.billing_account == "" ? 0 : 1
  billing_account = var.billing_account
  display_name    = "${var.app_name} monthly"
  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
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
  depends_on = [google_project_service.apis]
}
