#!/usr/bin/env bash
# Grants (or with --revoke, removes) what `npm run dev` needs on the live project.
# Usage: scripts/grant-dev.sh [--revoke] email [email...]
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-sop-app-prod-511406}"
ACTION=add
if [[ "${1:-}" == "--revoke" ]]; then ACTION=remove; shift; fi
[[ $# -gt 0 ]] || { echo "Usage: $0 [--revoke] email [email...]" >&2; exit 1; }

for email in "$@"; do
  member="user:$email"
  echo "== $ACTION $email"
  for role in roles/datastore.user roles/aiplatform.user roles/serviceusage.serviceUsageConsumer; do
    gcloud projects "$ACTION-iam-policy-binding" "$PROJECT" --member="$member" --role="$role" \
      --condition=None --quiet >/dev/null
    echo "  $role"
  done
  gcloud secrets "$ACTION-iam-policy-binding" sop-app-pseudonym-key --project "$PROJECT" \
    --member="$member" --role=roles/secretmanager.secretAccessor --quiet >/dev/null
  echo "  roles/secretmanager.secretAccessor (sop-app-pseudonym-key)"
  gcloud storage buckets "$ACTION-iam-policy-binding" "gs://$PROJECT-media" \
    --member="$member" --role=roles/storage.objectAdmin --quiet >/dev/null
  echo "  roles/storage.objectAdmin ($PROJECT-media)"
done
