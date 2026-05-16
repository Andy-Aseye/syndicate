variable "project_id" {
  type        = string
  description = "GCP project ID. Create one at https://console.cloud.google.com/projectcreate."
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "GCP region for all regional resources."
}
