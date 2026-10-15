#!/usr/bin/env bash
# Manual production deploy: build, scan, stage, verify, then promote.
# Mirrors .github/workflows/deploy.yml for deploying from a workstation.
# Requires: Docker running, gcloud logged in, Node 24. Run from Git Bash.
set -euo pipefail

GCP_PROJECT_ID="${GCP_PROJECT_ID:-sop-app-prod-511406}"
GCP_REGION="${GCP_REGION:-asia-northeast1}"
APP_NAME="${APP_NAME:-sop-app}"
RUNTIME_SA="${RUNTIME_SA:-sop-app-run@sop-app-prod-511406.iam.gserviceaccount.com}"
IMAGE_REPOSITORY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$APP_NAME"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty; commit or stash first so the image matches a commit." >&2
  exit 1
fi
IMAGE="$IMAGE_REPOSITORY/app:$(git rev-parse HEAD)"

docker build -t "$IMAGE" .
if [ "${SKIP_SCAN:-}" != 1 ]; then
  MSYS_NO_PATHCONV=1 docker run --rm -v //var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:0.65.0 image --quiet --severity CRITICAL,HIGH --ignore-unfixed --exit-code 1 "$IMAGE"
fi

gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet
docker push "$IMAGE"
DIGEST_IMAGE=$(docker image inspect "$IMAGE" --format '{{index .RepoDigests 0}}')
[[ "$DIGEST_IMAGE" =~ @sha256:[a-f0-9]{64}$ ]]

REVISION=$(gcloud run deploy "$APP_NAME" --image "$DIGEST_IMAGE" \
  --region "$GCP_REGION" --project "$GCP_PROJECT_ID" \
  --service-account "$RUNTIME_SA" --no-traffic --tag candidate \
  --format='value(status.latestCreatedRevisionName)' --quiet)
echo "Staged $REVISION"

CANDIDATE_URL=$(gcloud run services describe "$APP_NAME" --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" --format=json |
  node -e 'const s=JSON.parse(require("fs").readFileSync(0));process.stdout.write(s.status.traffic.find(t=>t.tag==="candidate").url)')
curl --fail --silent --show-error --max-time 30 "$CANDIDATE_URL/api/v1/health/ready"
STATUS=$(curl --silent --show-error --max-time 30 -o /dev/null -w '%{http_code}' "$CANDIDATE_URL/api/v1/workspace")
test "$STATUS" = 401

APP_NAME="$APP_NAME" GCP_REGION="$GCP_REGION" node scripts/firebase-config.mjs
npx --yes firebase-tools@15.33.0 deploy --config .firebase-deploy.json \
  --only firestore,hosting --project "$GCP_PROJECT_ID" --non-interactive

PREVIOUS=$(gcloud run services describe "$APP_NAME" --region "$GCP_REGION" --project "$GCP_PROJECT_ID" \
  --format=json |
  node -e 'const s=JSON.parse(require("fs").readFileSync(0));const t=s.status.traffic.filter(t=>t.percent>0).sort((a,b)=>b.percent-a.percent)[0];process.stdout.write(t?.revisionName??"")')
gcloud run services update-traffic "$APP_NAME" --to-revisions "$REVISION=100" --remove-tags candidate \
  --region "$GCP_REGION" --project "$GCP_PROJECT_ID" --quiet

SERVICE_URL=$(gcloud run services describe "$APP_NAME" --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" --format='value(status.url)')
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --show-error --max-time 30 "$SERVICE_URL/api/v1/health/ready" &&
    [ "$(curl --silent --max-time 30 -o /dev/null -w '%{http_code}' "$SERVICE_URL/api/v1/workspace")" = 401 ]; then
    echo "Live: https://$GCP_PROJECT_ID.web.app ($REVISION)"
    exit 0
  fi
  sleep 10
done

if [ -n "$PREVIOUS" ]; then
  gcloud run services update-traffic "$APP_NAME" --to-revisions "$PREVIOUS=100" \
    --region "$GCP_REGION" --project "$GCP_PROJECT_ID" --quiet
  echo "Live checks failed; traffic returned to $PREVIOUS." >&2
fi
exit 1
