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
  default     = "sop-app"
  description = "Prefix for resource names. Settle it before the first apply; Cloud Run services cannot be renamed."
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,16}[a-z0-9]$", var.app_name))
    error_message = "Use 4-18 lowercase letters, digits or hyphens."
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
  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 20 && floor(var.max_instances) == var.max_instances
    error_message = "max_instances must be an integer between 1 and 20."
  }
}
variable "billing_account" {
  type        = string
  default     = ""
  description = "Billing account ID (XXXXXX-XXXXXX-XXXXXX). Empty skips the budget alert."
}
variable "monthly_budget_usd" {
  type    = number
  default = 20
  validation {
    condition     = var.monthly_budget_usd > 0 && floor(var.monthly_budget_usd) == var.monthly_budget_usd
    error_message = "monthly_budget_usd must be a positive whole USD amount."
  }
}
variable "billing_cap_enabled" {
  type        = bool
  default     = false
  description = "Opt in to unlink billing (stopping every service) when monthly cost reaches monthly_budget_usd. false = log only."
}

variable "github_repository_id" {
  type        = string
  description = "Immutable numeric GitHub repository ID; prevents trusting a recreated repository with the same name."
  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "Provide the numeric GitHub repository ID."
  }
}

variable "initial_image" {
  type        = string
  description = "Verified application image for first apply, pinned by SHA256 digest. CI owns later image changes."
  validation {
    condition     = can(regex("^[a-z0-9.-]+/[a-zA-Z0-9/_-]+@sha256:[a-f0-9]{64}$", var.initial_image))
    error_message = "initial_image must be an image reference pinned with @sha256:<64 hex characters>."
  }
}
