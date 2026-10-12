import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Keep tests out of the local demo store in .demo-data.
process.env.GOOD_EXCEPTION_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'good-exception-test-'));
