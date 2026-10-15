import { cleanupDom } from '../support/dom';
import { after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthGate } from '../../src/features/auth/auth-gate';
import type { AuthService, AuthUser } from '../../src/lib/client/auth';
import { api } from '../../src/lib/client/browser';

after(() => cleanupDom());
afterEach(() => cleanup());

/** In-memory stand-in for Firebase Auth; `signIn` resolves to whatever the test queues. */
function fakeAuth(initial: AuthUser | null = null, secondFactor?: string) {
  let user = initial;
  const listeners = new Set<(u: AuthUser | null) => void>();
  const setUser = (next: AuthUser | null) => {
    user = next;
    listeners.forEach((l) => l(next));
  };
  const service: AuthService = {
    onChange(listener) {
      listeners.add(listener);
      listener(user);
      return () => listeners.delete(listener);
    },
    async signIn() {
      if (!secondFactor) {
        setUser({ email: 'expert@example.com' });
        return { status: 'signed_in' };
      }
      return {
        status: 'second_factor_required',
        async verify(code) {
          if (code !== secondFactor) throw new Error('auth/invalid-verification-code');
          setUser({ email: 'reviewer@example.com' });
        },
      };
    },
    async token() {
      return user ? 'id-token' : undefined;
    },
    async signOut() {
      setUser(null);
    },
    async enrollAuthenticator() {
      return {
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/Good%20Exception:expert@example.com?secret=JBSWY3DPEHPK3PXP',
        async confirm(code) {
          if (code !== '654321') throw new Error('auth/invalid-verification-code');
          enrolled.push(code);
        },
      };
    },
  };
  const enrolled: string[] = [];
  return { service, setUser, enrolled };
}

test('a signed-out visitor sees sign-in instead of the workspace, then the workspace', async () => {
  const { service } = fakeAuth();
  render(
    <AuthGate load={async () => service}>
      <p>Workspace</p>
    </AuthGate>,
  );
  const button = await screen.findByRole('button', { name: /sign in with google/i });
  assert.equal(screen.queryByText('Workspace'), null);
  fireEvent.click(button);
  await waitFor(() => assert.ok(screen.getByText('Workspace')));
});
test("API requests carry the signed-in person's ID token", async () => {
  const { service } = fakeAuth({ email: 'expert@example.com' });
  render(
    <AuthGate load={async () => service}>
      <p>Workspace</p>
    </AuthGate>,
  );
  await screen.findByText('Workspace');
  const sent: Headers[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(new Headers(init?.headers));
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  };
  await api.workspace();
  assert.equal(sent[0].get('authorization'), 'Bearer id-token');
});
test('without sign-in configured, as in the loopback demo, the workspace opens directly', async () => {
  render(
    <AuthGate load={async () => null}>
      <p>Workspace</p>
    </AuthGate>,
  );
  await screen.findByText('Workspace');
});
test('an account with an authenticator app is asked for its code before the workspace opens', async () => {
  const { service } = fakeAuth(null, '123456');
  render(
    <AuthGate load={async () => service}>
      <p>Workspace</p>
    </AuthGate>,
  );
  fireEvent.click(await screen.findByRole('button', { name: /sign in with google/i }));
  const code = await screen.findByLabelText(/authenticator code/i);
  fireEvent.change(code, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));
  await screen.findByRole('alert');
  assert.equal(screen.queryByText('Workspace'), null);
  fireEvent.change(code, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));
  await screen.findByText('Workspace');
});
test('a signed-in person sees their email and can sign out', async () => {
  const { service } = fakeAuth({ email: 'admin@example.com' });
  render(
    <AuthGate load={async () => service}>
      <p>Workspace</p>
    </AuthGate>,
  );
  await screen.findByText('admin@example.com');
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
  await screen.findByRole('button', { name: /sign in with google/i });
});
