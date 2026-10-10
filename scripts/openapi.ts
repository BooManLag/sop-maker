import { writeFile, readFile } from 'node:fs/promises';
import { z } from 'zod';
import { endpoints, schemas } from '../lib/server/contracts';
export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  const error = {
    description: 'Standard error; no stack, token, prompt or infrastructure details.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  };
  for (const endpoint of endpoints) {
    const path = `/${endpoint.path.replace(':id', '{id}')}`;
    const parameters: unknown[] = [];
    if (path.includes('{id}'))
      parameters.push({
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,128}$' },
      });
    if (endpoint.method === 'POST')
      parameters.push({
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description:
          'Required in production, scoped to actor and tenant; retained for 24 hours. Reusing with different input returns 409.',
        schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{16,128}$' },
      });
    if (endpoint.operation.endsWith('List'))
      parameters.push(
        ...[
          { name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'cursor', schema: { type: 'string', pattern: '^\\d{1,5}$', default: '0' } },
          { name: 'sort', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          { name: 'status', schema: { type: 'string', pattern: '^[a-z_]{1,32}$' } },
        ].map((x) => ({ ...x, in: 'query' })),
      );
    paths[path] ??= {};
    paths[path][endpoint.method.toLowerCase()] = {
      operationId: endpoint.operation,
      summary: endpoint.operation,
      description: `Requires ${endpoint.permission} permission. Tenant comes only from verified Firebase custom claims. Review/admin writes require recent MFA by default.`,
      security: [{ firebaseBearer: [] }],
      parameters,
      ...(endpoint.method === 'POST'
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: z.toJSONSchema(schemas[endpoint.operation], { unrepresentable: 'any' }),
                },
              },
            },
          }
        : {}),
      responses: {
        [endpoint.create ? '201' : '200']: {
          description:
            'Success. Private identity claims and raw uploaded records are omitted. Collection endpoints return {items,nextCursor,total}. See docs/API.md for response shapes.',
        },
        '400': error,
        '401': error,
        '403': error,
        '404': error,
        '409': error,
        '413': error,
        '415': error,
        '429': error,
        '503': error,
        '500': error,
      },
    };
  }
  for (const kind of ['live', 'ready'])
    paths[`/health/${kind}`] = {
      get: {
        operationId: `health_${kind}`,
        security: [],
        responses: {
          '200': { description: 'Minimal public health: {status:"ok"}.' },
          '503': error,
        },
      },
    };
  paths['/metrics'] = {
    get: {
      operationId: 'metrics',
      security: [{ firebaseBearer: [] }],
      description:
        'Admin-only, per-process counters, recent latency percentiles, in-flight requests and RSS.',
      responses: { '200': { description: 'Metrics snapshot' }, '401': error, '403': error },
    },
  };
  return {
    openapi: '3.1.0',
    info: {
      title: 'Good Exception backend',
      version: '1.0.0',
      description:
        'Versioned REST contract. /api remains a v1 compatibility alias. Strict request schemas reject unknown properties. Body <= 1 MB; <= 1000 imported rows. Real provider, media ingestion, trial allocation and analytics integrations fail explicitly until configured.',
    },
    servers: [{ url: '/api/v1' }, { url: '/api' }],
    paths,
    components: {
      securitySchemes: {
        firebaseBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error', 'code', 'requestId'],
          additionalProperties: false,
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  };
}
async function main() {
  const output = JSON.stringify(openApiDocument(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if ((await readFile('docs/openapi.json', 'utf8')) !== output)
      throw new Error('OpenAPI is stale. Run npm run api:generate.');
  } else await writeFile('docs/openapi.json', output);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
