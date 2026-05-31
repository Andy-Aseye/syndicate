// Atlas infrastructure-as-code.
//
// Provisions:
//   - Artifact Registry repo (for agent + dashboard images)
//   - Per-agent service accounts (one per agent = Agent Identity primitive)
//   - Firestore in Native mode
//   - BigQuery dataset for eval scores
//   - Cloud KMS keyring for per-client secrets
//   - IAM bindings
//
// Usage:
//   cd infra/terraform
//   terraform init
//   terraform apply -var="project_id=YOUR_PROJECT" -var="region=us-central1"

terraform {
  required_version = ">= 1.6"
  backend "gcs" {
    bucket = "atlas-tf-state-project-cc9b6e61-a019-4971-a10"
    prefix = "terraform/state"
  }
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.10" }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ---- Enable required APIs ----
locals {
  apis = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudkms.googleapis.com",
    "cloudtrace.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
  ]

  agents = [
    "coordinator",
    "discovery",
    "strategy",
    "designer",
    "developer",
    "pm",
    "account",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.key
  disable_on_destroy = false
}

# ---- Artifact Registry for container images ----
resource "google_artifact_registry_repository" "atlas" {
  location      = var.region
  repository_id = "atlas"
  format        = "DOCKER"
  description   = "Atlas agent + dashboard container images"
  depends_on    = [google_project_service.apis]
}

# ---- One service account per agent (Agent Identity primitive) ----
resource "google_service_account" "agent" {
  for_each     = toset(local.agents)
  account_id   = "atlas-${each.key}"
  display_name = "Atlas ${title(each.key)} Agent"
  description  = "Identity for the Atlas ${each.key} agent — used for Agent Identity, Cloud Trace, Firestore RW."
}

# Grant each agent SA: Firestore RW, Vertex User, Tracer, Storage Object User
resource "google_project_iam_member" "agent_firestore" {
  for_each = toset(local.agents)
  project  = var.project_id
  role     = "roles/datastore.user"
  member   = "serviceAccount:${google_service_account.agent[each.key].email}"
}

resource "google_project_iam_member" "agent_vertex" {
  for_each = toset(local.agents)
  project  = var.project_id
  role     = "roles/aiplatform.user"
  member   = "serviceAccount:${google_service_account.agent[each.key].email}"
}

resource "google_project_iam_member" "agent_trace" {
  for_each = toset(local.agents)
  project  = var.project_id
  role     = "roles/cloudtrace.agent"
  member   = "serviceAccount:${google_service_account.agent[each.key].email}"
}

# ---- Firestore (Native mode, multi-tenant) ----
resource "google_firestore_database" "atlas" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.apis]
}

# ---- BigQuery dataset for eval scores ----
resource "google_bigquery_dataset" "evals" {
  dataset_id  = "atlas_evals"
  description = "Atlas agent evaluation scores + cost/latency tables"
  location    = var.region
  depends_on  = [google_project_service.apis]
}

# ---- Cloud KMS keyring for per-client secrets ----
resource "google_kms_key_ring" "atlas" {
  name       = "atlas-secrets"
  location   = var.region
  depends_on = [google_project_service.apis]
}

resource "google_kms_crypto_key" "client_data" {
  name     = "client-data"
  key_ring = google_kms_key_ring.atlas.id
  purpose  = "ENCRYPT_DECRYPT"
}
