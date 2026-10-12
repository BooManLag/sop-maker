import { readConfig } from './config';
import { Backend } from '../application/backend';
import { JsonRepositoryProvider } from '../infrastructure/json-repository';
import { FirestoreRepositoryProvider } from '../infrastructure/firestore-repository';
import { firebaseTokenVerifier, firestoreDatabase } from '../infrastructure/firebase';
import { GuardedCaptureAdapter, UnavailableCaptureAdapter } from './ai';
import { DemoGeminiAdapter } from '../infrastructure/demo-capture-adapter';
import { VertexGeminiAdapter } from './gemini';
import { createHttpHandler } from './http';
import { AdmissionControl } from './limits';
import { AnalysisWorker, InlineAnalysisQueue } from '../application/analysis/worker';
import { adkDriver, vertexEmbedder } from './scan-agent';
import { CloudTasksQueue, cloudTasksVerifier } from './cloud-tasks';
let runtime: ReturnType<typeof compose> | undefined;
function compose() {
  const config = readConfig();
  const repositories =
    config.mode === 'demo'
      ? new JsonRepositoryProvider(config.dataDir)
      : new FirestoreRepositoryProvider(firestoreDatabase(config));
  const vertex =
    config.mode === 'production' && config.gemini && config.projectId
      ? { projectId: config.projectId, ...config.gemini }
      : undefined;
  const worker = vertex
    ? new AnalysisWorker(
        repositories,
        vertexEmbedder({ ...vertex, model: vertex.agentModel }),
        adkDriver({ ...vertex, model: vertex.agentModel }),
      )
    : undefined;
  const queue = worker
    ? config.tasks
      ? new CloudTasksQueue(config.tasks)
      : new InlineAnalysisQueue(worker)
    : undefined;
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(
      config.mode === 'demo'
        ? new DemoGeminiAdapter()
        : vertex
          ? VertexGeminiAdapter.fromSettings(vertex)
          : new UnavailableCaptureAdapter(),
    ),
    queue,
  );
  const admission = new AdmissionControl();
  return {
    backend,
    admission,
    handler: createHttpHandler({
      backend,
      config,
      verifier: firebaseTokenVerifier(config),
      admission,
      analysisTasks:
        worker && config.tasks ? { worker, verify: cloudTasksVerifier(config.tasks) } : undefined,
    }),
  };
}
export function getRuntime() {
  return (runtime ??= compose());
}
