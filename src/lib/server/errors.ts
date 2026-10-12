export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'UNSUPPORTED_MEDIA'
  | 'METHOD_NOT_ALLOWED';
const codes: Record<number, ErrorCode> = {
  400: 'INVALID_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA',
  422: 'INVALID_INPUT',
  429: 'RATE_LIMITED',
  503: 'UNAVAILABLE',
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: ErrorCode = codes[status] ?? 'INTERNAL_ERROR',
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function requireCondition(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new ApiError(status, message);
}
export function safeError(error: unknown, requestId: string) {
  const known = error instanceof ApiError;
  const status = known ? error.status : 500;
  return {
    status,
    body: {
      error: known
        ? error.message
        : 'An unexpected error occurred. Use the request ID when contacting support.',
      code: known ? error.code : 'INTERNAL_ERROR',
      requestId,
    },
    retryAfter: known ? error.retryAfter : undefined,
  };
}
