'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { QueryState } from '@/components/common/query-state';
import { useWorkspace } from '@/lib/client/queries';
import { ListRow } from './process-row';

export function ProcessList() {
  return (
    <QueryState query={useWorkspace()}>
      {({ processes }) =>
        processes.length ? (
          <div>
            {processes.map((p) => (
              <ListRow
                key={p.id}
                href={`/processes/${p.id}`}
                title={p.title}
                detail={`${p.equipment} · ${p.versions[0].steps.length} steps`}
                badge={
                  <Badge tone={p.currentVersion ? 'green' : 'amber'}>
                    {p.currentVersion ? `Published v${p.currentVersion}` : 'Draft'}
                  </Badge>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No processes yet."
            description="Capture your first one from an expert walkthrough."
            action={
              <Button asChild>
                <Link href="/processes/new">
                  Capture a process
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </Button>
            }
          />
        )
      }
    </QueryState>
  );
}
