import type { FirebaseOptions } from 'firebase/app';
import type { AuthService } from './auth';

/**
 * Firebase Hosting serves the project's public web config at this path, so one image works in
 * every project without build-time variables. Anywhere else (the loopback demo) the request
 * fails and sign-in stays off.
 */
const HOSTING_CONFIG = '/__/firebase/init.json';
const ISSUER = 'Good Exception';

async function hostingConfig(): Promise<FirebaseOptions | null> {
  try {
    const response = await fetch(HOSTING_CONFIG);
    return response.ok ? ((await response.json()) as FirebaseOptions) : null;
  } catch {
    return null;
  }
}

/** Google sign-in with an optional authenticator-app (TOTP) second factor. */
export async function loadFirebaseAuth(): Promise<AuthService | null> {
  const config = await hostingConfig();
  if (!config?.apiKey) return null;
  const [{ initializeApp, getApps }, firebase] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const auth = firebase.getAuth(getApps()[0] ?? initializeApp(config));
  const { TotpMultiFactorGenerator: Totp } = firebase;
  const signedIn = () => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    return auth.currentUser;
  };
  return {
    onChange: (listener) =>
      firebase.onAuthStateChanged(auth, (user) => listener(user && { email: user.email })),
    async signIn() {
      try {
        await firebase.signInWithPopup(auth, new firebase.GoogleAuthProvider());
        return { status: 'signed_in' };
      } catch (error) {
        if ((error as { code?: string }).code !== 'auth/multi-factor-auth-required') throw error;
        const resolver = firebase.getMultiFactorResolver(auth, error as never);
        const hint = resolver.hints.find((h) => h.factorId === Totp.FACTOR_ID);
        if (!hint) throw error;
        return {
          status: 'second_factor_required',
          async verify(code) {
            await resolver.resolveSignIn(Totp.assertionForSignIn(hint.uid, code));
          },
        };
      }
    },
    token: async () => auth.currentUser?.getIdToken(),
    signOut: () => firebase.signOut(auth),
    async enrollAuthenticator() {
      const user = signedIn();
      const enrolment = firebase.multiFactor(user);
      const secret = await Totp.generateSecret(await enrolment.getSession());
      return {
        secret: secret.secretKey,
        uri: secret.generateQrCodeUrl(user.email ?? 'account', ISSUER),
        async confirm(code) {
          await enrolment.enroll(Totp.assertionForEnrollment(secret, code), 'Authenticator app');
          // Refresh so the next API call carries the second-factor claim.
          await user.getIdToken(true);
        },
      };
    },
  };
}
