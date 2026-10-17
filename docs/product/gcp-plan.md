# Google Cloud build plan

Target: AI Builder Cup (JPAC). Judging weight that drives this plan: Technical Merit & Gen AI Implementation (40%), including scalability and sustainability. Hard requirements: Google AI models (Gemini) and deployment on Cloud Run or Firebase.

## Decisions

| Area | Decision |
|---|---|
| Runtime | Cloud Run from the existing `Dockerfile`; min instances 0, request-based CPU, tuned concurrency |
| Region | `asia-northeast1` (Tokyo) for Cloud Run, Firestore (permanent), Cloud Tasks |
| AI | Gemini on Vertex AI via the `global` endpoint; Flash for extraction, questions and triage; Pro only for change proposals |
| Scan analysis | Gemini groups the distinct job notes in memory; an ADK agent picks practices to test; code computes every rate with a held-out check on the newest 30% of jobs. Runs via Cloud Tasks (max 2 concurrent, 3 attempts). Groups are not persisted: tenant state is one size-capped document. |
| Multimodal | Deferred. If time allows: short browser audio clips sent straight to Gemini |
| Agent | ADK "good-exception finder" in Cloud Run; tools: get SOP, list note clusters, evaluate practice, propose finding; findings are candidates for human review. Firestore vector search across scans is a later addition |
| Quality | Structured output, safety settings (dangerous content blocks only at high, since SOPs name hazards), extraction and agent evals. Context caching skipped: our prompts are far below Vertex's minimum cacheable size |
| Observability | Cloud Logging and Trace, token/latency/cost metrics per feature, Monitoring dashboard, budget alert |
| IaC | Terraform (`infra/`), GCS state, variables `project_id`, `region`, `app_name`; Firebase CLI still owns rules and indexes |
| CI/CD | GitHub Actions with Workload Identity Federation (no keys) → Artifact Registry → Cloud Run |
| Ops | Firebase MCP server in `.mcp.json` with an allowlist of read-only tools; use a viewer credential |

Open: app name (Terraform variable until chosen, must be set before first apply), GCP project not yet created, hackathon theme.

## Build order

1. Vertex AI Gemini capture adapter replacing the stub
2. Terraform and CI deploy
3. ADK scan agent with Cloud Tasks (done)
4. Multimodal capture (deferred; lightweight browser audio if time allows)
5. Extraction and scan-agent evals (done)
6. AI usage metrics, Monitoring dashboard, architecture diagram (done)
