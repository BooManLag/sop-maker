// Hard spending cap: when the budget reports cost at or above its amount, unlink billing
// from the project. Every billable service stops; re-link billing in the console to restore.
const functions = require('@google-cloud/functions-framework');

const PROJECT_ID = process.env.CAP_PROJECT_ID;
const DRY_RUN = process.env.CAP_DRY_RUN === 'true';

async function accessToken() {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  if (!response.ok) throw new Error(`metadata token ${response.status}`);
  return (await response.json()).access_token;
}

async function billingApi(method, body) {
  const response = await fetch(
    `https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`,
    {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    },
  );
  if (!response.ok) throw new Error(`billing ${method} ${response.status}: ${await response.text()}`);
  return response.json();
}

functions.cloudEvent('capBilling', async (event) => {
  const data = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
  const { costAmount, budgetAmount, budgetDisplayName } = data;
  const log = (message, extra = {}) =>
    console.log(JSON.stringify({ event: 'billing_cap', message, costAmount, budgetAmount, budgetDisplayName, ...extra }));
  if (!(costAmount >= budgetAmount)) return log('under budget');
  const info = await billingApi('GET');
  if (!info.billingEnabled) return log('billing already disabled');
  if (DRY_RUN) return log('cap reached (dry run, billing left on)');
  await billingApi('PUT', { billingAccountName: '' });
  console.log(JSON.stringify({ severity: 'ALERT', event: 'billing_cap', message: 'billing disabled', costAmount, budgetAmount }));
});
