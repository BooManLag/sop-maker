'use client';

import { X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export function ErrorBanner({ error, onDismiss }: { error: Error | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <span>{error.message}</span>
      <button type="button" aria-label="Dismiss error" onClick={onDismiss}>
        <X size={16} />
      </button>
    </Alert>
  );
}
