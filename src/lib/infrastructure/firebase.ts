import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../server/config';
import type { TokenVerifier } from '../server/auth';
import { ApiError } from '../server/errors';
function app(config: ServerConfig) {
  const name = `good-exception-${config.projectId}`;
  return (
    getApps().find((a) => a.name === name) ??
    initializeApp(
      config.emulator
        ? { projectId: config.projectId }
        : { projectId: config.projectId, credential: applicationDefault() },
      name,
    )
  );
}
export function firebaseTokenVerifier(config: ServerConfig): TokenVerifier {
  return {
    verify: async (token) => {
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          getAuth(app(config)).verifyIdToken(token, true),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new ApiError(503, 'Identity verification is temporarily unavailable.')),
              5000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
export function firestoreDatabase(config: ServerConfig) {
  return getFirestore(app(config), config.databaseId);
}
