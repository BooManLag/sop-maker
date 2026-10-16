import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Runs the app in production mode against the Firebase Auth and Firestore emulators, so local
 * development shows only data you create yourself. Emulator data persists in .emulator-data/.
 */
const env = {
  ...process.env,
  GOOD_EXCEPTION_MODE: 'production',
  GOOGLE_CLOUD_PROJECT: 'demo-good-exception',
  GOOD_EXCEPTION_PSEUDONYM_KEY: 'local-emulator-pseudonym-key-not-a-live-secret',
  GOOD_EXCEPTION_REQUIRE_MFA: 'false',
  // Anyone signing in to the Auth emulator joins one local workspace as an admin.
  GOOD_EXCEPTION_OPEN_ORGANIZATION: 'local',
  GOOD_EXCEPTION_OPEN_ROLE: 'admin',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
};
// Live credentials and models never reach the emulators.
delete env.GOOGLE_APPLICATION_CREDENTIALS;
delete env.GOOD_EXCEPTION_GEMINI_MODEL;

const dataDir = '.emulator-data';
// The first run has nothing to import; later runs restore what the last one exported.
const importArgs = existsSync(`${dataDir}/firebase-export-metadata.json`)
  ? ['--import', dataDir]
  : [];

const child = spawn(
  'npx',
  [
    '--yes',
    '--package',
    'firebase-tools@15.33.0',
    'firebase',
    'emulators:exec',
    '--only',
    'auth,firestore',
    '--project',
    env.GOOGLE_CLOUD_PROJECT,
    '--config',
    'firebase.emulators.json',
    ...importArgs,
    `--export-on-exit=${dataDir}`,
    'next dev --hostname 127.0.0.1',
  ],
  { stdio: 'inherit', env },
);
child.on('exit', (code) => process.exit(code ?? 1));
