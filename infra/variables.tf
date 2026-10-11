variable "project_id" {
  type        = string
  description = "Existing GCP project with billing enabled."
}
variable "region" {
  type    = string
  default = "asia-northeast1"
}
variable "app_name" {
  type        = string
  default     = "good-exception"
  description = "Prefix for resource names. Settle it before the first apply; Cloud Run services cannot be renamed."
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,27}[a-z0-9]$", var.app_name))
    error_message = "Use 4-29 lowercase letters, digits or hyphens."
  }
}
variable "github_repository" {
  type        = string
  description = "owner/repo allowed to deploy through Workload Identity Federation."
}
variable "gemini_model" {
  type    = string
  default = "gemini-3.5-flash"
}
variable "agent_model" {
  type        = string
  default     = ""
  description = "Model for the scan agent. Empty = gemini_model."
}
variable "gemini_location" {
  type    = string
  default = "global"
}
variable "allowed_origins" {
  type        = list(string)
  default     = []
  description = "Exact HTTPS origins for the API. Empty = the Firebase Hosting defaults for the project."
}
variable "max_instances" {
  type    = number
  default = 5
}
variable "billing_account" {
  type        = string
  default     = ""
  description = "Billing account ID (XXXXXX-XXXXXX-XXXXXX). Empty skips the budget alert."
}
variable "monthly_budget_usd" {
  type    = number
  default = 20
}
