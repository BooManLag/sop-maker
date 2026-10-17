# All providers are mocked. These tests cannot provision or mutate cloud resources.
mock_provider "google" {
  mock_resource "google_service_account" {
    defaults = {
      name   = "projects/demo-infra-test/serviceAccounts/mock-account@demo-infra-test.iam.gserviceaccount.com"
      id     = "projects/demo-infra-test/serviceAccounts/mock-account@demo-infra-test.iam.gserviceaccount.com"
      email  = "mock-account@demo-infra-test.iam.gserviceaccount.com"
      member = "serviceAccount:mock-account@demo-infra-test.iam.gserviceaccount.com"
    }
  }
  mock_resource "google_monitoring_dashboard" {
    defaults = { id = "projects/demo-infra-test/dashboards/test-dashboard" }
  }
  mock_resource "google_iam_workload_identity_pool" {
    defaults = { name = "projects/123456789012/locations/global/workloadIdentityPools/github" }
  }

  mock_data "google_project" {
    defaults = { number = "123456789012" }
  }
}
mock_provider "google-beta" {
  mock_resource "google_project_service_identity" {
    defaults = { email = "service-123456789012@gcp-sa-pubsub.iam.gserviceaccount.com" }
  }
}
mock_provider "random" {}
mock_provider "archive" {}
variables {
  project_id           = "demo-infra-test"
  github_repository    = "example/repository"
  github_repository_id = "123456"
  initial_image        = "asia-northeast1-docker.pkg.dev/demo-infra-test/sop-app/app@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
run "safe_defaults" {
  command = apply
  assert {
    condition     = google_cloud_run_v2_service.app.deletion_protection && google_cloud_run_v2_service.app.template[0].max_instance_request_concurrency == 16
    error_message = "Protect the service and keep concurrency within the backend admission envelope."
  }
  assert {
    condition     = contains([for e in google_cloud_run_v2_service.app.template[0].containers[0].env : "${e.name}=${e.value}" if e.value != null], "GOOD_EXCEPTION_MODE=production")
    error_message = "Cloud Run must explicitly select production mode."
  }
  assert {
    condition     = contains(keys(google_project_iam_member.runtime), "roles/firebaseauth.viewer")
    error_message = "Revocation checks need Firebase user read access."
  }
  assert {
    condition     = google_firestore_database.default.delete_protection_state == "DELETE_PROTECTION_ENABLED" && google_firestore_database.default.deletion_policy == "ABANDON"
    error_message = "Never destroy the production database with the stack."
  }
  assert {
    condition     = endswith(google_service_account_iam_member.deployer_wif.member, "/.github/workflows/deploy.yml@refs/heads/main") && endswith(google_service_account_iam_member.eval_wif.member, "/.github/workflows/eval.yml@refs/heads/main")
    error_message = "Deployment and evaluation identities must trust only their own workflow."
  }
}
run "budget_dry_run" {
  command = apply
  variables { billing_account = "ABCDEF-ABCDEF-ABCDEF" }
  assert {
    condition     = !contains(keys(google_project_iam_member.billing_cap), "roles/billing.projectManager") && google_cloudfunctions2_function.billing_cap[0].service_config[0].environment_variables["CAP_DRY_RUN"] == "true"
    error_message = "Budget monitoring must not have billing shutoff authority by default."
  }
  assert {
    condition     = google_pubsub_topic_iam_member.budget_publisher[0].member == "serviceAccount:billing-budget-alert@system.gserviceaccount.com"
    error_message = "Budget updates need the official publisher identity."
  }
}
run "explicit_billing_shutoff" {
  command = apply
  variables {
    billing_account     = "ABCDEF-ABCDEF-ABCDEF"
    billing_cap_enabled = true
  }
  assert {
    condition     = contains(keys(google_project_iam_member.billing_cap), "roles/billing.projectManager") && google_cloudfunctions2_function.billing_cap[0].service_config[0].environment_variables["CAP_DRY_RUN"] == "false"
    error_message = "Explicit opt-in must grant and enable billing shutoff."
  }
}
run "invalid_limits" {
  command = plan
  variables {
    app_name           = "this-name-exceeds-service-account-limits"
    max_instances      = 0
    monthly_budget_usd = 0
  }
  expect_failures = [var.app_name, var.max_instances, var.monthly_budget_usd]
}
run "planner_trusts_only_infra_workflow" {
  command = apply
  assert {
    condition     = strcontains(google_iam_workload_identity_pool_provider.infra_plan.attribute_condition, "assertion.repository_id == '123456'") && strcontains(google_iam_workload_identity_pool_provider.infra_plan.attribute_condition, "assertion.workflow_ref.startsWith('example/repository/.github/workflows/infra.yml@')")
    error_message = "The planner provider must accept only this repository's infra workflow."
  }
  assert {
    condition     = google_service_account_iam_member.planner_wif.member == "principalSet://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/github/attribute.infra_plan/example/repository"
    error_message = "The planner must trust only the attribute that the planner provider alone maps."
  }
}
run "planner_is_read_only" {
  command = apply
  variables { billing_account = "ABCDEF-ABCDEF-ABCDEF" }
  assert {
    condition     = toset(keys(google_project_iam_member.planner)) == toset(["roles/viewer", "roles/iam.securityReviewer"])
    error_message = "The planner may only read project resources and IAM policies."
  }
  assert {
    condition     = google_storage_bucket_iam_member.planner_state.bucket == "demo-infra-test-tfstate" && google_storage_bucket_iam_member.planner_state.role == "roles/storage.objectViewer"
    error_message = "The planner reads state but never writes it (plans run with -lock=false)."
  }
  assert {
    condition     = google_billing_account_iam_member.planner[0].role == "roles/billing.viewer"
    error_message = "Planning budget resources needs read access to the billing account and nothing more."
  }
}
run "applier_trusts_only_infra_workflow_on_main" {
  command = apply
  assert {
    condition     = google_service_account_iam_member.applier_wif.member == "principalSet://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/github/attribute.workflow/example/repository/.github/workflows/infra.yml@refs/heads/main"
    error_message = "Only infra.yml on main may apply infrastructure."
  }
}
run "applier_owns_project_without_billing" {
  command = apply
  assert {
    condition     = google_project_iam_member.applier.role == "roles/owner" && google_project_iam_member.applier.member == google_service_account.applier.member
    error_message = "The applier manages every project resource, including IAM."
  }
  assert {
    condition     = length(google_billing_account_iam_member.applier) == 0
    error_message = "No billing account access without a configured billing account."
  }
}
run "applier_manages_budgets_with_billing" {
  command = apply
  variables { billing_account = "ABCDEF-ABCDEF-ABCDEF" }
  assert {
    condition     = google_billing_account_iam_member.applier[0].billing_account_id == "ABCDEF-ABCDEF-ABCDEF" && google_billing_account_iam_member.applier[0].role == "roles/billing.costsManager"
    error_message = "Budgets live on the billing account, outside project ownership."
  }
}
run "pull_requests_cannot_reach_privileged_identities" {
  command = apply
  assert {
    condition     = endswith(google_iam_workload_identity_pool_provider.github.attribute_condition, "&& assertion.ref == 'refs/heads/main'")
    error_message = "The deploy provider must only accept main."
  }
  assert {
    condition     = !contains(keys(google_iam_workload_identity_pool_provider.infra_plan.attribute_mapping), "attribute.workflow")
    error_message = "Planner tokens must never match deployer, eval or applier bindings."
  }
}
