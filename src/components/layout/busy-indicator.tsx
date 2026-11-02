'use client';

import { useIsMutating } from '@tanstack/react-query';

export function BusyIndicator() {
  const working = useIsMutating() > 0;
  if (!working) return null;
  return (
    <div
      role="status"
      className="fixed right-6 bottom-5 z-50 rounded-md border border-border-strong bg-muted px-4.5 py-2.5 text-xs text-brand-500"
    >
      Working…
    </div>
  );
}
