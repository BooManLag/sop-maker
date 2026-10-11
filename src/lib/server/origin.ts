/** Next.js may normalize Request.url to localhost; the HTTP Host retains the browser's loopback origin. */
export function localRequestOrigin(request: Request): string | null {
  try {
    const requestUrl = new URL(request.url);
    const candidate = new URL(
      `${requestUrl.protocol}//${request.headers.get('host') ?? requestUrl.host}`,
    );
    if (
      !['http:', 'https:'].includes(candidate.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(candidate.hostname) ||
      candidate.username ||
      candidate.password ||
      candidate.pathname !== '/'
    )
      return null;
    return candidate.origin;
  } catch {
    return null;
  }
}
