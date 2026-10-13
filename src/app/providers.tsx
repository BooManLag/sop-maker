'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthGate } from '@/features/auth/auth-gate';
import { loadFirebaseAuth } from '@/lib/client/firebase-auth';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate load={loadFirebaseAuth}>{children}</AuthGate>
      <Toaster />
    </QueryClientProvider>
  );
}
