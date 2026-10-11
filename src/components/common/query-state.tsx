'use client';

import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { EmptyState } from './empty-state';

/** Renders children once a query has data; otherwise a quiet loading or error state. */
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending)
    return (
      <p role="status" className="py-16 text-center text-xs text-subtle-foreground">
        Loading…
      </p>
    );
  if (query.isError)
    return <EmptyState title="This page could not be loaded." description={query.error.message} />;
  return children(query.data);
}
