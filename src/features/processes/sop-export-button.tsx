'use client';

import { ExportButton } from '@/components/common/export-button';
import type { ProcessDto } from '@/lib/client/api';
import { useWorkspace } from '@/lib/client/queries';
import type { ProcessStep } from '@/lib/domain/types';
import { useStepStills } from './step-still';

/** Export for a process: JSON as before, plus a deck or PDF with its step images. */
export function SopExportButton({
  process,
  steps = process.versions.at(-1)?.steps ?? [],
  data,
  fileName,
}: {
  process: ProcessDto;
  steps?: ProcessStep[];
  /** The page's JSON export, unchanged. */
  data: unknown;
  fileName: string;
}) {
  const demo = useWorkspace().data?.demo ?? false;
  const stills = useStepStills(process.id, steps);
  return <ExportButton data={data} fileName={fileName} sop={{ process, steps, demo, stills }} />;
}
