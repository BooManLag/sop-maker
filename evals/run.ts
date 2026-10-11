/**
 * Live eval against Vertex AI. Needs application default credentials and:
 *   GOOGLE_CLOUD_PROJECT, GOOD_EXCEPTION_GEMINI_MODEL, optional GOOD_EXCEPTION_AGENT_MODEL,
 *   GOOGLE_CLOUD_LOCATION (default global), GOOD_EXCEPTION_EMBEDDING_MODEL.
 * Exits non-zero when quality drops below the bar, so it can gate a model change.
 */
import { VertexGeminiAdapter } from '../lib/server/gemini';
import { GuardedCaptureAdapter } from '../lib/server/ai';
import { adkDriver, vertexEmbedder } from '../lib/server/scan-agent';
import { AnalysisToolkit, clusterSignals } from '../lib/application/analysis/toolkit';
import { extractionCases, scoreExtraction } from './extraction-cases';
import { scanRecords, scanSteps, scoreScan } from './scan-cases';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const model = process.env.GOOD_EXCEPTION_GEMINI_MODEL;
if (!projectId || !model) {
  console.error('Set GOOGLE_CLOUD_PROJECT and GOOD_EXCEPTION_GEMINI_MODEL.');
  process.exit(2);
}
const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'global';
const agentModel = process.env.GOOD_EXCEPTION_AGENT_MODEL ?? model;
const embeddingModel = process.env.GOOD_EXCEPTION_EMBEDDING_MODEL ?? 'gemini-embedding-001';
const RUNS = Number(process.env.EVAL_RUNS ?? 2);

async function main() {
  const capture = new GuardedCaptureAdapter(
    VertexGeminiAdapter.fromSettings({ projectId: projectId!, location, model: model! }),
  );
  const rows: Record<string, unknown>[] = [];
  let passed = 0;
  let total = 0;
  for (const c of extractionCases)
    for (let run = 0; run < RUNS; run++) {
      const started = performance.now();
      total++;
      try {
        const { steps } = await capture.extract(c.walkthrough, false);
        const score = scoreExtraction(c, steps);
        if (score.pass) passed++;
        rows.push({
          case: c.name,
          run,
          ms: Math.round(performance.now() - started),
          ...score,
          forbiddenPresent: score.forbiddenPresent.join(','),
        });
      } catch (error) {
        rows.push({ case: c.name, run, pass: false, error: (error as Error).message });
      }
    }
  console.table(rows);
  const extractionRate = passed / total;

  const settings = { projectId: projectId!, location, model: agentModel, embeddingModel };
  const records = scanRecords();
  const scanRows: Record<string, unknown>[] = [];
  let scanPassed = 0;
  for (let run = 0; run < RUNS; run++) {
    const started = performance.now();
    const kit = new AnalysisToolkit(
      records,
      scanSteps,
      await clusterSignals(records, vertexEmbedder(settings)),
    );
    await adkDriver(settings)(kit, new AbortController().signal);
    const score = scoreScan(kit.proposals);
    if (score.pass) scanPassed++;
    scanRows.push({
      run,
      ms: Math.round(performance.now() - started),
      clusters: kit.clusters.length,
      findings: kit.proposals.length,
      ...score,
    });
  }
  console.table(scanRows);
  const scanRate = scanPassed / RUNS;
  console.log(JSON.stringify({ model, agentModel, extractionRate, scanRate }));
  if (extractionRate < 0.8 || scanRate < 0.5) process.exit(1);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
