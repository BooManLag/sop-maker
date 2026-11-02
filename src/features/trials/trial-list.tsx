'use client';

import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { QueryState } from '@/components/common/query-state';
import { ListRow } from '@/features/processes/process-row';
import { useWorkspace } from '@/lib/client/queries';

export function TrialList() {
  return (
    <QueryState query={useWorkspace()}>
      {({ trials, findings }) =>
        trials.length ? (
          <div>
            {trials.map((t) => (
              <ListRow
                key={t.id}
                href={`/trials/${t.id}`}
                icon={FlaskConical}
                title={findings.find((f) => f.id === t.findingId)?.practice ?? 'Validation trial'}
                detail={`${t.equipment} · ${t.requiredPerGroup.toLocaleString()} planned jobs per group${t.demo ? ' · Demo' : ''}`}
                badge={
                  <Badge tone={t.status === 'complete' ? 'green' : 'amber'}>
                    {t.status === 'complete' ? 'Result available' : 'In progress'}
                  </Badge>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Every better standard starts with a fair test."
            description="Review a strong candidate finding, then create a validation trial."
            action={
              <Button asChild>
                <Link href="/findings">
                  Explore findings
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
