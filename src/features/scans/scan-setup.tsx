'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Disclosure } from '@/components/common/disclosure';
import { Eyebrow } from '@/components/common/eyebrow';
import { ErrorBanner } from '@/components/common/error-banner';
import { UploadArea } from '@/components/common/upload-area';
import { FormActions, WithSideRail, sideRailClass } from '@/components/common/layouts';
import { QueryState } from '@/components/common/query-state';
import { api } from '@/lib/client/browser';
import type { ProcessDto, ServiceRecord } from '@/lib/client/api';
import { useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import { readServiceRecords } from '@/lib/domain/records';

/** Only the seeded demo baseline has a sample scenario. */
const sampleProcessId = 'valve-replacement';

type Evidence =
  { kind: 'sample' } | { kind: 'records'; fileName: string; rows: ServiceRecord[] } | null;

async function checkEvidence(processId: string, evidence: Exclude<Evidence, null>) {
  const scan = await api.createScan(
    evidence.kind === 'sample'
      ? { processId, demo: true }
      : { processId, demo: false, rows: evidence.rows },
  );
  await api.checkReadiness(scan.id);
  return scan.id;
}

export function ScanSetup({ requestedProcessId }: { requestedProcessId?: string }) {
  return (
    <QueryState query={useWorkspace()}>
      {(workspace) => (
        <ScanSetupForm
          baselines={workspace.processes.filter((p) => p.currentVersion > 0)}
          requestedProcessId={requestedProcessId}
        />
      )}
    </QueryState>
  );
}

function ScanSetupForm({
  baselines,
  requestedProcessId,
}: {
  baselines: ProcessDto[];
  requestedProcessId?: string;
}) {
  const router = useRouter();
  const initialProcess =
    baselines.find((p) => p.id === requestedProcessId)?.id ?? baselines[0]?.id ?? '';
  const [processId, setProcessId] = useState(initialProcess);
  const [evidence, setEvidence] = useState<Evidence>(
    initialProcess === sampleProcessId && !requestedProcessId ? { kind: 'sample' } : null,
  );
  const [importError, setImportError] = useState<Error | null>(null);
  const check = useWorkspaceMutation(
    (input: { processId: string; evidence: Exclude<Evidence, null> }) =>
      checkEvidence(input.processId, input.evidence),
  );
  const goToReadiness = (scanId: string) => router.push(`/scans/${scanId}`);

  async function importRecords(file: File) {
    setImportError(null);
    try {
      setEvidence({ kind: 'records', fileName: file.name, rows: await readServiceRecords(file) });
    } catch (error) {
      setImportError(error instanceof Error ? error : new Error('This file could not be read.'));
    }
  }

  function chooseSample() {
    setProcessId(sampleProcessId);
    setEvidence({ kind: 'sample' });
    check.mutate(
      { processId: sampleProcessId, evidence: { kind: 'sample' } },
      { onSuccess: goToReadiness },
    );
  }

  const error = check.error ?? importError;
  return (
    <>
      <ErrorBanner
        error={error}
        onDismiss={() => {
          check.reset();
          setImportError(null);
        }}
      />
      <WithSideRail>
        <Card className="grid gap-6">
          <div className="flex flex-col gap-2 text-xs text-foreground-soft">
            <Label htmlFor="baseline">Baseline SOP</Label>
            <Select
              value={processId}
              onValueChange={(next) => {
                setProcessId(next);
                if (next !== sampleProcessId && evidence?.kind === 'sample') setEvidence(null);
              }}
            >
              <SelectTrigger id="baseline">
                <SelectValue placeholder="Publish a baseline SOP first" />
              </SelectTrigger>
              <SelectContent>
                {baselines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} · v{p.currentVersion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="m-0 text-xs text-brand-400">
            Publish a structured SOP through Create first SOP before scanning a new process.
            Arbitrary document interpretation is not connected.
          </p>
          <div className="flex flex-col gap-2 text-xs text-foreground-soft">
            <Label htmlFor="outcome">Outcome to compare</Label>
            <Select value="callback" disabled>
              <SelectTrigger id="outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="callback">30-day callback / no callback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <UploadArea
            title={
              evidence?.kind === 'records' ? evidence.fileName : 'Upload historical service records'
            }
            hint="CSV or XLSX · up to 4 MB"
            accept=".csv,.xlsx"
            onFile={(file) => void importRecords(file)}
          />
          {evidence?.kind === 'records' && (
            <p className="m-0 flex items-center gap-2 text-xs text-brand-600">
              <Check size={15} aria-hidden />
              {evidence.rows.length} jobs imported. Technician IDs will be pseudonymized.
            </p>
          )}

          <Disclosure summary="Required record fields">
            <p>
              job_id, technician_id, equipment_model, job_type, checklist_values,
              callback_within_30_days. Optional: asset_id, timestamp, parts_used, notes.
            </p>
            <p>
              Use true/false, yes/no, or 1/0 for callbacks. Include only records with a complete
              30-day observation window. Remove names and personal details from notes before
              importing.
            </p>
            <Button variant="link" asChild>
              <a href="/sample-jobs.csv" download>
                Download CSV format
                <Download size={14} aria-hidden />
              </a>
            </Button>
          </Disclosure>

          <FormActions>
            <Button
              disabled={check.isPending || !processId || !evidence}
              onClick={() =>
                evidence && check.mutate({ processId, evidence }, { onSuccess: goToReadiness })
              }
            >
              {check.isPending ? 'Checking data…' : 'Check data'}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </FormActions>
        </Card>

        <Card tone="sample" className={sideRailClass}>
          <Eyebrow>A COHERENT SAMPLE SCENARIO</Eyebrow>
          <Search size={29} aria-hidden className="mt-6 text-brand-400" />
          <h3 className="text-xl! leading-[1.3]">
            One valve.
            <br />A better second check.
          </h3>
          <p>
            Explore a sample of 47,219 jobs. Follow a promising field practice through a controlled
            trial.
          </p>
          <Button variant="secondary" disabled={check.isPending} onClick={chooseSample}>
            Use sample service records
            <ArrowUpRight size={15} aria-hidden />
          </Button>
          {evidence?.kind === 'sample' && (
            <small className="flex! items-center gap-2 text-xs! text-brand-600!">
              <Check size={14} aria-hidden />
              Sample scenario selected
            </small>
          )}
          <p className="mt-4 text-xs! text-brand-400">
            All sample outcomes are illustrative. Uploaded data is never substituted with these
            findings.
          </p>
        </Card>
      </WithSideRail>
    </>
  );
}
