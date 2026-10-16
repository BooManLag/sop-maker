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
import { CloudTasksQueue, cloudTasksVerifier, mediaWorkerUrl } from './cloud-tasks';
import { GcsMedia } from '../infrastructure/gcs-media';
import { GeminiTranscriber } from './gemini-transcriber';
import { InlineMediaJobs, QueuedMediaJobs } from './media-jobs';
import { MediaWorker } from '../application/media-worker';
import {
  LocalMediaStore,
  LocalMediaUploads,
  LocalUploadSigner,
} from '../infrastructure/local-media';
import { DemoTranscriber } from '../infrastructure/demo-transcriber';
import path from 'node:path';
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
  const media = composeMedia();
  function composeMedia() {
    // The loopback demo keeps media on local disk and transcribes with a labelled sample.
    if (config.mode === 'demo') {
      const signer = new LocalUploadSigner();
      const store = new LocalMediaStore(path.join(config.dataDir, 'media'));
      const worker = new MediaWorker(repositories, store, new DemoTranscriber());
      return { signer, uploads: new LocalMediaUploads(signer, store, worker) };
    }
    if (!config.mediaBucket || !vertex) return undefined;
    const bucket = new GcsMedia(config.mediaBucket);
    const worker = new MediaWorker(repositories, bucket, new GeminiTranscriber(vertex, bucket));
    // A developer's own credentials cannot sign bucket URLs, so local uploads come through the
    // dev server, which writes to the bucket and transcribes inline.
    if (config.local) {
      const signer = new LocalUploadSigner();
      return { signer, uploads: new LocalMediaUploads(signer, bucket, worker) };
    }
    if (!config.tasks) return { signer: bucket, jobs: new InlineMediaJobs(bucket, worker) };
    const url = mediaWorkerUrl(config.tasks);
    return {
      signer: bucket,
      jobs: new QueuedMediaJobs(bucket, new CloudTasksQueue(config.tasks), url),
      tasks: { worker, verify: cloudTasksVerifier(config.tasks, url) },
    };
  }
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
    media?.signer,
    media && 'jobs' in media ? media.jobs : undefined,
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
      mediaUploads: media && 'uploads' in media ? media.uploads : undefined,
      mediaTasks: media && 'tasks' in media ? media.tasks : undefined,
    }),
  };
}
export function getRuntime() {
  return (runtime ??= compose());
}
