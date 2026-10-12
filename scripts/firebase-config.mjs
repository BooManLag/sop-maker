import { readFile, writeFile } from 'node:fs/promises';
const { APP_NAME, GCP_REGION } = process.env;
if (
  !/^[a-z][a-z0-9-]{2,16}[a-z0-9]$/.test(APP_NAME ?? '') ||
  !/^[a-z]+-[a-z]+[0-9]+$/.test(GCP_REGION ?? '')
) {
  throw new Error('Set APP_NAME and GCP_REGION to the Terraform service and region.');
}
const config = JSON.parse(await readFile('firebase.json', 'utf8'));
config.hosting.rewrites = [{ source: '**', run: { serviceId: APP_NAME, region: GCP_REGION } }];
await writeFile('.firebase-deploy.json', JSON.stringify(config, null, 2) + '\n');
