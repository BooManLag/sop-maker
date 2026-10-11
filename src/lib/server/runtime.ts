import { readConfig } from './config';
import { Backend } from '../application/backend';
import { JsonRepositoryProvider } from '../infrastructure/json-repository';
import { FirestoreRepositoryProvider } from '../infrastructure/firestore-repository';
import { firebaseTokenVerifier, firestoreDatabase } from '../infrastructure/firebase';
import { GuardedCaptureAdapter, UnavailableCaptureAdapter } from './ai';
import { DemoGeminiAdapter } from '../infrastructure/demo-capture-adapter';
import { createHttpHandler } from './http';
import { AdmissionControl } from './limits';
let runtime: ReturnType<typeof compose> | undefined;
function compose() {
  const config = readConfig();
  const repositories =
    config.mode === 'demo'
      ? new JsonRepositoryProvider(config.dataDir)
      : new FirestoreRepositoryProvider(firestoreDatabase(config));
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(
      config.mode === 'demo' ? new DemoGeminiAdapter() : new UnavailableCaptureAdapter(),
    ),
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
    }),
  };
}
export function getRuntime() {
  return (runtime ??= compose());
}
