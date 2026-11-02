import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Browser tests run their own server on a separate port against a throwaway store, never the local demo data.
const dataDir = mkdtempSync(path.join(tmpdir(), 'good-exception-e2e-'));
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', headless: true },
  webServer: {
    command: 'npx next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      GOOD_EXCEPTION_DATA_DIR: dataDir,
      GOOD_EXCEPTION_NEXT_DIR: '.next-e2e',
      GOOD_EXCEPTION_MODE: 'demo',
    },
  },
});
