'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setTokenSource, type AuthService, type AuthUser } from '@/lib/client/auth';

type GateState =
  | { phase: 'loading' }
  | { phase: 'open' }
  | { phase: 'signed_out'; auth: AuthService }
  | { phase: 'signed_in'; auth: AuthService; user: AuthUser };

/**
 * Shows the workspace only to signed-in people. `load` resolves to null when sign-in is not
 * configured (the loopback demo), and the workspace then opens without it.
 */
export function AuthGate({
  load,
  children,
}: {
  load: () => Promise<AuthService | null>;
  children: ReactNode;
}) {
  const [state, setState] = useState<GateState>({ phase: 'loading' });
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void load().then((auth) => {
      if (!active) return;
      if (!auth) return setState({ phase: 'open' });
      setTokenSource(() => auth.token());
      unsubscribe = auth.onChange((user) =>
        setState(user ? { phase: 'signed_in', auth, user } : { phase: 'signed_out', auth }),
      );
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [load]);

  if (state.phase === 'loading') return null;
  if (state.phase === 'signed_out') return <SignIn auth={state.auth} />;
  if (state.phase === 'signed_in')
    return (
      <>
        <AccountBar auth={state.auth} user={state.user} />
        {children}
      </>
    );
  return <>{children}</>;
}

function SignIn({ auth }: { auth: AuthService }) {
  const [error, setError] = useState<string>();
  const [challenge, setChallenge] = useState<(code: string) => Promise<void>>();
  const start = async () => {
    setError(undefined);
    try {
      const result = await auth.signIn();
      if (result.status === 'second_factor_required') setChallenge(() => result.verify);
    } catch {
      setError('Sign-in did not complete. Please try again.');
    }
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <h1 className="text-xl font-semibold">Sign in to Good Exception</h1>
        <p className="text-sm text-muted-foreground">Use your work Google account.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {challenge ? (
          <CodeForm
            onSubmit={(code) =>
              challenge(code).catch(() =>
                setError('That code did not match. Try the current code.'),
              )
            }
          />
        ) : (
          <Button onClick={start}>Sign in with Google</Button>
        )}
      </Card>
    </main>
  );
}

function CodeForm({ onSubmit }: { onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(code.trim());
      }}
    >
      <Label htmlFor="authenticator-code">Authenticator code</Label>
      <Input
        id="authenticator-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <Button type="submit">Verify</Button>
    </form>
  );
}

/** Who is signed in, and sign-out. */
function AccountBar({ auth, user }: { auth: AuthService; user: AuthUser }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 text-sm">
      <span className="text-muted-foreground">{user.email}</span>
      <Button variant="ghost" className="ml-auto" onClick={() => void auth.signOut()}>
        Sign out
      </Button>
    </div>
  );
}
