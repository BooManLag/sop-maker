'use client';

import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/page/section-header';
import { useWorkspace } from '@/lib/client/queries';
import { ListRow } from '@/features/processes/process-row';

export function LivingStandards() {
  const { data } = useWorkspace();
  return (
    <section className="mt-7">
      <SectionHeader
        title="Your living standards"
        link={{ href: '/processes', label: 'All processes' }}
      />
      {data?.processes.slice(0, 2).map((p) => (
        <ListRow
          key={p.id}
          href={`/processes/${p.id}`}
          title={p.title}
          detail={
            <>
              {p.equipment} <span className="px-2">·</span>
              {p.currentVersion ? 'Published baseline' : 'Awaiting human review'}
            </>
          }
          badge={
            <Badge tone={p.currentVersion ? 'green' : 'gray'}>
              {p.currentVersion ? `Version ${p.currentVersion}` : 'Draft v1'}
            </Badge>
          }
        />
      ))}
    </section>
  );
}
