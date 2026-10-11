'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BackLink } from '@/components/common/back-link';
import { EmptyState } from '@/components/common/empty-state';
import { ExportButton } from '@/components/common/export-button';
import { PageTitle } from '@/components/common/page-title';
import { QueryState } from '@/components/common/query-state';
import { WithSideRail, sideRailClass } from '@/components/common/layouts';
import { useProcess } from '@/lib/client/queries';
import { StepView } from './step-view';

export function LivingSop({ processId }: { processId: string }) {
  return (
    <>
      <BackLink href="/processes" />
      <QueryState query={useProcess(processId)}>
        {(process) => {
          const latest = process.versions.at(-1);
          return (
            <>
              <PageTitle
                eyebrow="LIVING SOP"
                title={process.title}
                description={`${process.equipment} · ${process.currentVersion ? `Version ${process.currentVersion}` : 'Draft v1'}`}
                action={<ExportButton data={process} fileName="living-sop.json" />}
              />
              <WithSideRail>
                <Card>
                  {latest?.steps.length ? (
                    latest.steps.map((step) => <StepView key={step.id} step={step} />)
                  ) : (
                    <EmptyState
                      title="This draft is waiting for a walkthrough."
                      description="Start a new capture to create a reviewed baseline."
                    />
                  )}
                </Card>
                <Card className={sideRailClass}>
                  <h3 className="mt-0!">Version history</h3>
                  {process.versions.map((v) => (
                    <div key={v.id} className="mt-5.5 border-b border-border pb-5">
                      <Badge tone={v.status === 'published' ? 'green' : 'gray'}>
                        {v.status === 'published' ? `v${v.version}` : `Draft v${v.version}`}
                      </Badge>
                      <p className="mt-3 mb-1">
                        {v.version === 1
                          ? 'Created from expert know-how'
                          : 'Validated field practice'}
                      </p>
                      <small className="mt-0!">
                        {v.status === 'published' ? 'Human-approved baseline' : 'Not published'}
                      </small>
                    </div>
                  ))}
                  <p className="mt-4 text-xs! text-brand-400">
                    Proposed changes stay separate until your organization approves them.
                  </p>
                  {process.currentVersion > 0 && (
                    <Button variant="secondary" asChild>
                      <Link href={`/scans/new?processId=${process.id}`}>
                        Improve this SOP
                        <ArrowRight size={15} aria-hidden />
                      </Link>
                    </Button>
                  )}
                </Card>
              </WithSideRail>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
