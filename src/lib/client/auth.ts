/** The signed-in person, as far as the browser needs to know. */
export interface AuthUser {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}
export type SignInResult =
  | { status: 'signed_in' }
  /** The account has an authenticator app; the sign-in completes once a valid code is given. */
  | { status: 'second_factor_required'; verify(code: string): Promise<void> };

/** Browser sign-in. Firebase implements it in production; tests pass a fake. */
export interface AuthService {
  /** Calls the listener now and on every change; returns an unsubscribe function. */
  onChange(listener: (user: AuthUser | null) => void): () => void;
  signIn(): Promise<SignInResult>;
  /** A current ID token for API requests, refreshed by the provider when it nears expiry. */
  token(): Promise<string | undefined>;
  signOut(): Promise<void>;
  /** Starts adding an authenticator app (TOTP) as a second factor for the signed-in person. */
  enrollAuthenticator(): Promise<AuthenticatorEnrollment>;
}
export interface AuthenticatorEnrollment {
  /** Base32 secret to type into the app, and the otpauth:// URI the app can import. */
  secret: string;
  uri: string;
  /** Finishes enrolment once the app shows a valid code. */
  confirm(code: string): Promise<void>;
}

let tokenSource: (() => Promise<string | undefined>) | undefined;
/** Set by the auth gate once sign-in is configured; the loopback demo leaves it unset. */
export function setTokenSource(source: AuthService['token'] | undefined) {
  tokenSource = source;
}
export const currentToken = async () => tokenSource?.();
