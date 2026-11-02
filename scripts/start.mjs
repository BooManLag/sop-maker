import { cpSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
const server = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: {
    ...process.env,
    HOSTNAME: process.env.GOOD_EXCEPTION_MODE === 'production' ? '0.0.0.0' : '127.0.0.1',
    GOOD_EXCEPTION_DATA_DIR:
      process.env.GOOD_EXCEPTION_DATA_DIR || path.join(process.cwd(), '.demo-data'),
  },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 1));
