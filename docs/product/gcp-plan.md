# Google Cloud build plan

Target: AI Builder Cup (JPAC). Judging weight that drives this plan: Technical Merit & Gen AI Implementation (40%), including scalability and sustainability. Hard requirements: Google AI models (Gemini) and deployment on Cloud Run or Firebase.

## Decisions

| Area | Decision |
|---|---|
| Runtime | Cloud Run from the existing `Dockerfile`; min instances 0, request-based CPU, tuned concurrency |
| Region | `asia-northeast1` (Tokyo) for Cloud Run, Firestore (permanent), Storage, Eventarc |
| AI | Gemini on Vertex AI via the `global` endpoint; Flash for extraction, questions and triage; Pro only for change proposals; Vertex text embeddings |
| Multimodal | Signed upload to Cloud Storage → Eventarc → worker → Gemini returns steps with timestamps |
| Agent | ADK "good-exception finder" in Cloud Run; tools: Firestore vector search, SOP comparison, sample-size planning, proposal drafting; human approval required |
| Quality | Structured output, context caching, safety settings, extraction eval set in CI |
| Observability | Cloud Logging and Trace, token/latency/cost metrics per feature, Monitoring dashboard, budget alert |
| IaC | Terraform (`infra/`), GCS state, variables `project_id`, `region`, `app_name`; Firebase CLI still owns rules and indexes |
| CI/CD | GitHub Actions with Workload Identity Federation (no keys) → Artifact Registry → Cloud Run |
| Ops | Firebase MCP server, read-only, viewer credential |

Open: app name (Terraform variable until chosen, must be set before first apply), GCP project not yet created, hackathon theme.

## Build order

1. Vertex AI Gemini capture adapter replacing the stub
2. Terraform and CI deploy
3. Multimodal capture pipeline
4. ADK agent with Firestore vector search
5. Extraction eval set
6. Monitoring dashboard and architecture diagram
