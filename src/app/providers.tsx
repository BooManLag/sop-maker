'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthGate } from '@/features/auth/auth-gate';
import { loadFirebaseAuth } from '@/lib/client/firebase-auth';
import { z } from 'zod';

// Our CSP has no 'unsafe-eval' in production; stop Zod probing `new Function` (it logs a CSP violation).
z.config({ jitless: true });

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
