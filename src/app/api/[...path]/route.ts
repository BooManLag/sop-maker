import { getRuntime } from '@/lib/server/runtime';
import { randomUUID } from 'node:crypto';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function route(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    return await getRuntime().handler(request, (await context.params).path);
  } catch {
    // Configuration failures must not reveal secret names or infrastructure details.
    const requestId = randomUUID();
    console.error(
      JSON.stringify({ severity: 'ERROR', event: 'backend_initialization_failed', requestId }),
    );
    return Response.json(
      { error: 'Backend configuration is unavailable.', code: 'UNAVAILABLE', requestId },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    );
  }
}
export const GET = route;
export const POST = route;
export const OPTIONS = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;
