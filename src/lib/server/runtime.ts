import { readConfig } from './config';
import { Backend } from '../application/backend';
import { JsonRepositoryProvider } from '../infrastructure/json-repository';
import { FirestoreRepositoryProvider } from '../infrastructure/firestore-repository';
import { firebaseTokenVerifier, firestoreDatabase } from '../infrastructure/firebase';
import { GuardedCaptureAdapter, UnavailableCaptureAdapter } from './ai';
import { DemoGeminiAdapter } from '../infrastructure/demo-capture-adapter';
import { VertexGeminiAdapter, vertexGenerate } from './gemini';
import { createHttpHandler } from './http';
import { AdmissionControl } from './limits';
import { AnalysisWorker, InlineAnalysisQueue } from '../application/analysis/worker';
import { adkDriver, geminiNoteGrouper } from './scan-agent';
import {
  OFFLINE_ANALYSIS,
  OfflineNoteGrouper,
  offlineDriver,
} from '../infrastructure/offline-analysis';
import { CloudTasksQueue, cloudTasksVerifier, mediaWorkerUrl } from './cloud-tasks';
import { GcsMedia } from '../infrastructure/gcs-media';
import { GeminiTranscriber } from './gemini-transcriber';
import { InlineMediaJobs, QueuedMediaJobs } from './media-jobs';
import { MediaWorker } from '../application/media-worker';
import type { MediaJobs, MediaLibrary, UploadSigner } from '../application/ports';
import {
  LocalMediaLibrary,
  LocalMediaStore,
  LocalMediaUploads,
  LocalUploadSigner,
} from '../infrastructure/local-media';
import { DemoTranscriber } from '../infrastructure/demo-transcriber';
import path from 'node:path';
/** How recordings arrive and get processed; every part is absent when media is unavailable. */
interface MediaWiring {
  signer?: UploadSigner;
  /** Loopback only: receives uploads addressed by locally signed URLs. */
  uploads?: LocalMediaUploads;
  /** Reads and copies for step images and frame picking. */
  library?: MediaLibrary;
  /** Loopback only: serves reads addressed by locally signed URLs. */
  files?: LocalMediaLibrary;
  jobs?: MediaJobs;
  tasks?: { worker: MediaWorker; verify: (request: Request) => Promise<boolean> };
}
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
  // The loopback demo analyzes imported records offline, with labelled word-based grouping.
  const worker = vertex
    ? new AnalysisWorker(
        repositories,
        geminiNoteGrouper(vertexGenerate({ ...vertex, model: vertex.agentModel })),
        adkDriver({ ...vertex, model: vertex.agentModel }),
      )
    : config.mode === 'demo'
      ? new AnalysisWorker(
          repositories,
          new OfflineNoteGrouper(),
          offlineDriver,
          undefined,
          OFFLINE_ANALYSIS,
        )
      : undefined;
  const queue = worker
    ? config.tasks
      ? new CloudTasksQueue(config.tasks)
      : new InlineAnalysisQueue(worker)
    : undefined;
  const media: MediaWiring = composeMedia();
  function composeMedia(): MediaWiring {
    // The loopback demo keeps media on local disk and transcribes with a labelled sample.
    if (config.mode === 'demo') {
      const signer = new LocalUploadSigner();
      const store = new LocalMediaStore(path.join(config.dataDir, 'media'));
      const worker = new MediaWorker(repositories, store, new DemoTranscriber());
      const files = new LocalMediaLibrary(signer, store);
      return {
        signer,
        uploads: new LocalMediaUploads(signer, store, worker),
        library: files,
        files,
      };
    }
    if (!config.mediaBucket || !vertex) return {};
    const bucket = new GcsMedia(config.mediaBucket);
    const worker = new MediaWorker(repositories, bucket, new GeminiTranscriber(vertex, bucket));
    // A developer's own credentials cannot sign bucket URLs, so local uploads and reads come
    // through the dev server, which talks to the bucket and transcribes inline.
    if (config.local) {
      const signer = new LocalUploadSigner();
      const files = new LocalMediaLibrary(signer, bucket);
      return {
        signer,
        uploads: new LocalMediaUploads(signer, bucket, worker),
        library: files,
        files,
      };
    }
    if (!config.tasks)
      return { signer: bucket, library: bucket, jobs: new InlineMediaJobs(bucket, worker) };
    const url = mediaWorkerUrl(config.tasks);
    return {
      signer: bucket,
      library: bucket,
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
    media.signer,
    media.jobs,
    media.library,
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
      mediaUploads: media.uploads,
      mediaFiles: media.files,
      mediaTasks: media.tasks,
    }),
  };
}
export function getRuntime() {
  return (runtime ??= compose());
}
