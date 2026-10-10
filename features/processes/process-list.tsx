'use client';

import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/page/query-state';
import { useWorkspace } from '@/lib/client/queries';
import { ListRow } from './process-row';

export function ProcessList() {
  return (
    <QueryState query={useWorkspace()}>
      {({ processes }) => (
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
      )}
    </QueryState>
  );
}
