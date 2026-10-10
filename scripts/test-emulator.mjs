import { spawn } from 'node:child_process';
const env = {
  ...process.env,
  GOOD_EXCEPTION_MODE: 'production',
  GOOGLE_CLOUD_PROJECT: 'demo-good-exception',
  GOOD_EXCEPTION_ALLOWED_ORIGINS: 'https://app.example.test',
  GOOD_EXCEPTION_PSEUDONYM_KEY: 'emulator-only-pseudonym-key-not-a-live-secret',
  GOOD_EXCEPTION_REQUIRE_MFA: 'false',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
};
// The platform's live ADC binding is intentionally excluded from isolated emulator tests.
delete env.GOOGLE_APPLICATION_CREDENTIALS;
const child = spawn(
  process.execPath,
  ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/integration/firebase.test.ts'],
  { stdio: 'inherit', env },
);
child.on('exit', (code) => process.exit(code ?? 1));
