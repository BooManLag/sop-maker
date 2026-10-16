import type { NextConfig } from 'next';
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const config: NextConfig = {
  output: 'standalone',
  distDir: process.env.GOOD_EXCEPTION_NEXT_DIR || '.next',
  serverExternalPackages: ['firebase-admin', 'proper-lockfile', '@google/adk'],
  poweredByHeader: false,
  async rewrites() {
    return authEmulatorHost
      ? [{ source: '/__/firebase/init.json', destination: '/local-firebase-config' }]
      : [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com" +
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.googleapis.com https://lh3.googleusercontent.com; media-src 'self' blob:; font-src 'self'; connect-src 'self'" +
              (authEmulatorHost ? ` http://${authEmulatorHost}` : '') +
              " https://storage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
