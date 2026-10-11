'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/common/error-banner';
import { FormActions, WithSideRail } from '@/components/common/layouts';
import { PageTitle } from '@/components/common/page-title';
import { QueryState } from '@/components/common/query-state';
import { api } from '@/lib/client/browser';
import type { ScanDetail } from '@/lib/client/api';
import { useScan, useWorkspaceMutation } from '@/lib/client/queries';
import type { Readiness as ReadinessReport } from '@/lib/domain/types';

const strengthTone = (value: string) =>
  ['Strong', 'Good'].includes(value) ? 'green' : value === 'Limited' ? 'amber' : 'gray';

export function Readiness({ scanId }: { scanId: string }) {
  return (
    <QueryState query={useScan(scanId)}>
      {(scan) =>
        scan.readiness ? (
          <ReadinessReview scan={scan} readiness={scan.readiness} />
        ) : (
          <PendingCheck scanId={scan.id} />
        )
      }
    </QueryState>
  );
}

function PendingCheck({ scanId }: { scanId: string }) {
  const check = useWorkspaceMutation(() => api.checkReadiness(scanId));
  return (
    <>
      <ErrorBanner error={check.error} onDismiss={check.reset} />
      <PageTitle
        eyebrow="IMPORTED DATA"
        title="These records have not been checked yet."
        description="A useful finding starts with knowing what was actually recorded."
      />
      <Button disabled={check.isPending} onClick={() => check.mutate(undefined)}>
        {check.isPending ? 'Checking data…' : 'Check data'}
        <ArrowRight size={16} aria-hidden />
      </Button>
    </>
  );
}

function ReadinessReview({ scan, readiness }: { scan: ScanDetail; readiness: ReadinessReport }) {
  const router = useRouter();
  const run = useWorkspaceMutation(() => api.runScan(scan.id));
  return (
    <>
      <ErrorBanner error={run.error} onDismiss={run.reset} />
      <PageTitle
        eyebrow={`${scan.demo ? 'SAMPLE SCENARIO' : 'IMPORTED DATA'} · ${readiness.count.toLocaleString()} JOBS`}
        title={
          readiness.eligible
            ? 'What the records can tell us.'
            : 'Not enough evidence for a reliable scan.'
        }
        description="A useful finding starts with knowing what was actually recorded."
      />
      <WithSideRail>
        <Card>
          {readiness.categories.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-between border-b border-border py-5 text-sm first:pt-1 last:border-b-0 last:pb-1"
            >
              <span>{c.label}</span>
              <Badge tone={strengthTone(c.value)}>{c.value}</Badge>
            </div>
          ))}
        </Card>
        <section className="px-2 py-3 [&_h3]:mt-4 [&_h3]:text-lead [&_h3]:text-brand-500 [&_p]:flex [&_p]:items-start [&_p]:gap-2 [&_p]:text-xs [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg]:text-brand-300">
          <h3>We can reliably review</h3>
          {readiness.can.map((item) => (
            <p key={item} className="text-foreground-soft">
              <Check size={17} aria-hidden />
              {item}
            </p>
          ))}
          <h3>We cannot reliably analyze</h3>
          {readiness.cannot.map((item) => (
            <p key={item} className="text-brand-400">
              <X size={17} aria-hidden />
              {item}
            </p>
          ))}
        </section>
      </WithSideRail>
      {readiness.missing.length > 0 && (
        <Alert variant="warning">
          <strong>What&apos;s missing</strong>
          {readiness.missing.map((item) => (
            <p key={item} className="m-0 text-warning">
              {item}
            </p>
          ))}
        </Alert>
      )}
      {!scan.demo && readiness.eligible && (
        <Alert>
          The data passed the initial readiness check. Live analytics is not connected; the scan
          cannot yet produce evidence-backed findings for this upload.
        </Alert>
      )}
      <FormActions>
        <Button variant="secondary" asChild>
          <Link href={`/scans/new?processId=${scan.processId}`}>Change data</Link>
        </Button>
        <Button
          disabled={run.isPending || !readiness.eligible || !scan.demo}
          onClick={() =>
            run.mutate(undefined, { onSuccess: () => router.push(`/scans/${scan.id}/results`) })
          }
        >
          Run sample scan
          <ArrowRight size={16} aria-hidden />
        </Button>
      </FormActions>
    </>
  );
}
