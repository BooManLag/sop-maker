export async function registerNode() {
  const { getRuntime } = await import('./runtime');
  const runtime = getRuntime();
  const globalState = globalThis as typeof globalThis & { backendHooksRegistered?: boolean };
  if (globalState.backendHooksRegistered) return;
  globalState.backendHooksRegistered = true;
  process.once('SIGTERM', () => {
    void runtime.admission.drain(8000);
  });
  const fatal = () => {
    process.stderr.write(
      JSON.stringify({
        severity: 'CRITICAL',
        event: 'unhandled_backend_failure',
        timestamp: new Date().toISOString(),
      }) + '\n',
      () => process.exit(1),
    );
  };
  process.once('uncaughtException', fatal);
  process.once('unhandledRejection', fatal);
}
