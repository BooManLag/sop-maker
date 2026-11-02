// Scans one test file against a published SOP on a LOCAL demo server and prints the result.
// Usage: node .agents/skills/test-scans-with-data/scripts/scan-local.mjs <file> <processId> [baseUrl]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [file, processId, baseUrl = 'http://127.0.0.1:3000'] = process.argv.slice(2);
if (!file || !processId) {
  console.error('Usage: node scan-local.mjs <file> <processId> [baseUrl]');
  process.exit(2);
}
const base = new URL('/api/v1/', baseUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
  console.error('Refusing to run against a non-local server. Test production through the web UI.');
  process.exit(2);
}
const XLSX = createRequire(resolve('package.json'))('xlsx');

async function call(method, path, body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body
        ? { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(json)}`);
  return json;
}

const workbook = XLSX.read(readFileSync(file), { type: 'buffer', raw: true });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
const scan = await call('POST', 'scans', { processId, demo: false, rows });
const readiness = await call('POST', `scans/${scan.id}/readiness`, {});
console.log(`scan ${scan.id}: ${rows.length} rows, ready=${readiness.eligible}`);
if (!readiness.eligible) {
  for (const reason of readiness.missing) console.log(`  missing: ${reason}`);
  process.exit(0);
}
await call('POST', `scans/${scan.id}/run`, {});
let status;
for (let i = 0; i < 120; i++) {
  status = await call('GET', `scans/${scan.id}`);
  if (status.status !== 'analyzing') break;
  await new Promise((r) => setTimeout(r, 1000));
}
console.log(`status ${status.status}, funnel ${JSON.stringify(status.funnel ?? null)}`);
if (status.status !== 'complete') process.exit(1);
for (const f of await call('GET', `scans/${scan.id}/findings`)) {
  const d = await call('GET', `findings/${f.id}`);
  console.log(
    `  [${d.grade}] ${d.title}\n    step: ${d.standard}\n    ${d.practiceRate}% vs ${d.baselineRate}%, ` +
      `${d.evidence.sampleSize} jobs, ${d.technicians} technicians, z=${d.evidence.statistics?.z}\n` +
      `    ${base.origin}/findings/${d.id}`,
  );
}
