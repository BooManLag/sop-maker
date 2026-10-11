# Log-based metrics read the structured lines from lib/server/ai-usage.ts and the scan worker.
locals {
  service_logs = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.app_name}\""
  ai_usage     = "${local.service_logs} AND jsonPayload.event=\"ai_usage\""
  feature_label = {
    key        = "feature"
    value_type = "STRING"
  }
  ai_distributions = {
    ai_input_tokens  = { field = "inputTokens", unit = "1", desc = "Input tokens (embeddings: characters) per AI operation" }
    ai_output_tokens = { field = "outputTokens", unit = "1", desc = "Output and thinking tokens per AI operation" }
    ai_latency       = { field = "durationMs", unit = "ms", desc = "AI operation latency" }
  }
}

resource "google_logging_metric" "ai_calls" {
  name   = "${var.app_name}/ai_calls"
  filter = local.ai_usage
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key        = local.feature_label.key
      value_type = local.feature_label.value_type
    }
    labels {
      key        = "model"
      value_type = "STRING"
    }
    labels {
      key        = "ok"
      value_type = "STRING"
    }
  }
  label_extractors = {
    feature = "EXTRACT(jsonPayload.feature)"
    model   = "EXTRACT(jsonPayload.model)"
    ok      = "EXTRACT(jsonPayload.ok)"
  }
}

resource "google_logging_metric" "ai_distribution" {
  for_each        = local.ai_distributions
  name            = "${var.app_name}/${each.key}"
  description     = each.value.desc
  filter          = "${local.ai_usage} AND jsonPayload.ok=true"
  value_extractor = "EXTRACT(jsonPayload.${each.value.field})"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = each.value.unit
    labels {
      key        = local.feature_label.key
      value_type = local.feature_label.value_type
    }
  }
  label_extractors = { feature = "EXTRACT(jsonPayload.feature)" }
  bucket_options {
    exponential_buckets {
      num_finite_buckets = 40
      growth_factor      = 1.4
      scale              = 1
    }
  }
}

resource "google_logging_metric" "scan_analyses" {
  name   = "${var.app_name}/scan_analyses"
  filter = "${local.service_logs} AND (jsonPayload.event=\"scan_analysis_complete\" OR (jsonPayload.event=\"scan_analysis_failed\" AND jsonPayload.finalAttempt=true))"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key        = "outcome"
      value_type = "STRING"
    }
  }
  label_extractors = { outcome = "EXTRACT(jsonPayload.event)" }
}

locals {
  run_filter = "resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${var.app_name}\""
  user_metric = { for k, v in merge(
    { ai_calls = google_logging_metric.ai_calls, scan_analyses = google_logging_metric.scan_analyses },
    google_logging_metric.ai_distribution,
  ) : k => "metric.type=\"logging.googleapis.com/user/${v.name}\"" }
  tiles = [
    { title = "Requests by status class", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\"", align = "ALIGN_RATE", reduce = "REDUCE_SUM", group = ["metric.label.\"response_code_class\""] },
    { title = "Request latency p95 (ms)", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_latencies\"", align = "ALIGN_DELTA", reduce = "REDUCE_PERCENTILE_95", group = [] },
    { title = "Instances (scales to zero)", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/instance_count\"", align = "ALIGN_MAX", reduce = "REDUCE_SUM", group = [] },
    { title = "Gemini calls by feature", filter = local.user_metric.ai_calls, align = "ALIGN_RATE", reduce = "REDUCE_SUM", group = ["metric.label.\"feature\""] },
    { title = "AI latency p95 by feature (ms)", filter = local.user_metric.ai_latency, align = "ALIGN_DELTA", reduce = "REDUCE_PERCENTILE_95", group = ["metric.label.\"feature\""] },
    { title = "Input tokens per operation, p50", filter = local.user_metric.ai_input_tokens, align = "ALIGN_DELTA", reduce = "REDUCE_PERCENTILE_50", group = ["metric.label.\"feature\""] },
    { title = "Output tokens per operation, p50", filter = local.user_metric.ai_output_tokens, align = "ALIGN_DELTA", reduce = "REDUCE_PERCENTILE_50", group = ["metric.label.\"feature\""] },
    { title = "Scan analyses by outcome", filter = local.user_metric.scan_analyses, align = "ALIGN_SUM", reduce = "REDUCE_SUM", group = ["metric.label.\"outcome\""] },
    { title = "Analysis queue depth", filter = "resource.type=\"cloud_tasks_queue\" AND resource.label.\"queue_id\"=\"${google_cloud_tasks_queue.analysis.name}\" AND metric.type=\"cloudtasks.googleapis.com/queue/depth\"", align = "ALIGN_MAX", reduce = "REDUCE_MAX", group = [] },
  ]
}

resource "google_monitoring_dashboard" "app" {
  dashboard_json = jsonencode({
    displayName = "${var.app_name} — AI and service health"
    mosaicLayout = {
      columns = 12
      tiles = [for i, t in local.tiles : {
        xPos   = (i % 3) * 4
        yPos   = floor(i / 3) * 4
        width  = 4
        height = 4
        widget = {
          title = t.title
          xyChart = {
            dataSets = [{
              plotType = "LINE"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = t.filter
                  aggregation = {
                    alignmentPeriod    = "300s"
                    perSeriesAligner   = t.align
                    crossSeriesReducer = t.reduce
                    groupByFields      = t.group
                  }
                }
              }
            }]
          }
        }
      }]
    }
  })
  depends_on = [google_logging_metric.ai_calls, google_logging_metric.ai_distribution, google_logging_metric.scan_analyses]
}

output "dashboard_url" {
  value = "https://console.cloud.google.com/monitoring/dashboards/builder/${element(split("/", google_monitoring_dashboard.app.id), 3)}?project=${var.project_id}"
}
