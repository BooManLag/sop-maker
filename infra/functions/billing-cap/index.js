const functions = require('@google-cloud/functions-framework');
const { createHandler } = require('./handler');
const PROJECT_ID = process.env.CAP_PROJECT_ID;
async function accessToken() {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error(`metadata token ${response.status}`);
  const { access_token } = await response.json();
  if (typeof access_token !== 'string' || !access_token) throw new Error('Missing workload token');
  return access_token;
}
async function billingApi(method, body) {
  const response = await fetch(
    `https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`,
    {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error(`billing ${method} ${response.status}`);
  return response.json();
}
functions.cloudEvent(
  'capBilling',
  createHandler({
    projectId: PROJECT_ID,
    budgetName: process.env.CAP_BUDGET_NAME,
    budgetAmount: Number(process.env.CAP_BUDGET_AMOUNT),
    topic: process.env.CAP_TOPIC,
    dryRun: process.env.CAP_DRY_RUN !== 'false',
    billingApi,
  }),
);
