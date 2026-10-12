# Infrastructure

Terraform for the production stack in `asia-northeast1`: Cloud Run, Firestore, Vertex AI access, Artifact Registry, Secret Manager, GitHub Workload Identity Federation and an optional budget alert. Firestore rules, indexes and Hosting are deployed by the Firebase CLI in CI, not here.

## First setup

1. Create a GCP project in the console and link billing.
2. Create the state bucket (once):
   ```sh
   gcloud storage buckets create gs://<project_id>-tfstate --project <project_id> --location asia-northeast1 --uniform-bucket-level-access
   gcloud storage buckets update gs://<project_id>-tfstate --versioning
   ```
3. Apply:
   ```sh
   cp prod.tfvars.example prod.tfvars   # fill in project_id
   gcloud auth application-default login
   terraform init -backend-config="bucket=<project_id>-tfstate"
   terraform apply -var-file=prod.tfvars
   ```
4. Copy the `github_variables` output into GitHub repository variables.
5. In the Firebase console, enable the Authentication sign-in providers you want.

Merging to `main` then builds the image, deploys a Cloud Run revision, and deploys rules, indexes and Hosting.

## Notes

- `app_name` (default `sop-app`, deliberately brand-neutral) and `region` cannot change after the first apply without recreating the service. Rebrand through UI text and a custom Hosting domain instead. Firestore's location is permanent.
- The generated pseudonym key is stored in Terraform state, so the state bucket must stay private.
- Cloud Run scales to zero; the first request after idle has a cold start.
