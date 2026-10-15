'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { SectionHeader } from '@/components/common/section-header';
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
      {data && !data.processes.length && (
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
      )}
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
