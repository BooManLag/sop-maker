export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerNode } = await import('./lib/server/hooks');
    await registerNode();
  }
}
