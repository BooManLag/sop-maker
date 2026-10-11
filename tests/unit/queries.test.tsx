import { cleanupDom } from '../support/dom';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspace, useWorkspaceMutation } from '../../src/lib/client/queries';
import { api } from '../../src/lib/client/browser';
import { realBackendFetch } from '../support/real-backend';

after(() => cleanupDom());

test('after a write, pages showing workspace data refresh without a reload', async () => {
  const backend = await realBackendFetch('demo');
  globalThis.fetch = backend.fetch;

  const queryClient = new QueryClient({
    // No garbage-collection timers, so the test process can exit as soon as it finishes.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => ({ workspace: useWorkspace(), dismiss: useWorkspaceMutation(api.dismissFinding) }),
    { wrapper },
  );
  const statusOf = (id: string) =>
    result.current.workspace.data?.findings.find((f) => f.id === id)?.status;

  await waitFor(() => assert.equal(statusOf('finding-31'), 'candidate'));
  await act(() => result.current.dismiss.mutateAsync('finding-31'));
  await waitFor(() => assert.equal(statusOf('finding-31'), 'dismissed'));

  unmount();
  queryClient.clear();
});
