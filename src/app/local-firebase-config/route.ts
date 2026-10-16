/**
 * Firebase Hosting serves the web config at /__/firebase/init.json. Locally, against the Auth
 * emulator, next.config rewrites that path here so sign-in works without a real project.
 */
export function GET() {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!emulatorHost || process.env.K_SERVICE) return new Response(null, { status: 404 });
  return Response.json({
    apiKey: 'local-emulator',
    authDomain: '127.0.0.1',
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    authEmulatorUrl: `http://${emulatorHost}`,
  });
}
