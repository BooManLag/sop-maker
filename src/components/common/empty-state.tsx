import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-6 py-15 text-center text-brand-400">
      <FileText size={28} className="mx-auto mb-5" aria-hidden />
      <h2 className="mb-3 text-lg text-foreground">{title}</h2>
      <p className="text-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
