# Backend validation — 2026-10-10

Scope: local application and isolated Firebase Auth/Firestore emulators. No live cloud resources, paid AI calls or deployment were used.

| Check | Result |
| --- | --- |
| Unit/domain/security/persistence/AI/HTTP suite | 37 passed; zero failed or skipped |
| Actual Firebase Auth and Firestore emulator suite | 3 passed; zero failed or skipped |
| Playwright product workflows | 2 passed |
| TypeScript and optimized Next.js build | Passed, including standalone Docker build |
| Prettier and generated OpenAPI drift checks | Passed |
| Full npm dependency audit | Zero vulnerabilities |
| Local bounded read load | 400/400 successful requests, concurrency 16, p95 32.28 ms; see local-load.json |
| Docker runtime smoke | Runs as user `node`; readiness and workspace requests succeed in explicit local demo mode |
| Missing production configuration | Backend request fails closed (HTTP 500 from Next.js instrumentation initialization); no demo workspace is exposed |
| Trivy 0.75.0 container vulnerability scan | Zero HIGH/CRITICAL findings with available fixes, using `--scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1` |

The load result measures the local HTTP handler and JSON disk reads, excluding network transport, Firestore and cloud autoscaling. It is not a production capacity claim. The AI evaluation uses deterministic synthetic fixtures; it does not establish live model quality.

The initial container scan found patchable Debian Perl vulnerabilities and vulnerabilities in the base image's bundled npm dependencies. The runtime image now applies authenticated Debian package updates and removes unused npm/yarn tooling. The rebuilt image passed scanning and runtime smoke checks. TLS, package signatures and artifact checksum verification remained enabled. The optional build certificate is mounted temporarily and is not retained in the image.

Scanned local image ID: `sha256:2bfe20b0ec3ae1bc82b500e1bf120a6cc506341bbc8e9edd398f87bd4c1d71a6`. Image tags, vulnerability databases and package repositories change; CI rebuilds and rescans each revision. This result does not assert that lower-severity or unfixed vulnerabilities are absent.

The CI workflow runs code checks, unit tests, browser workflows, emulator tests, dependency audit, local load checks and a container scan. Remote CI results and required branch protection are separate from local results and must be verified on GitHub. Live IAM, backups/restore, alert delivery, retention scheduling, frontend authentication and production integrations remain open in the [checklist](../backend-checklist.md).
