'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportSop, type ExportFormat, type ExportableSop } from '@/features/export/export-sop';

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
const json = (data: unknown) =>
  new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

/** Exports the page's data as JSON; with an SOP, also as a PowerPoint deck or a PDF. */
export function ExportButton({
  data,
  fileName,
  sop,
}: {
  data: unknown;
  fileName: string;
  sop?: ExportableSop;
}) {
  const [busy, setBusy] = useState<ExportFormat>();
  const [failed, setFailed] = useState(false);
  if (!sop)
    return (
      <Button variant="secondary" onClick={() => saveFile(json(data), fileName)}>
        <Download size={15} aria-hidden />
        Export
      </Button>
    );

  async function exportAs(format: ExportFormat) {
    setBusy(format);
    setFailed(false);
    try {
      const file = await exportSop(format, sop!);
      saveFile(file.blob, file.fileName);
    } catch {
      setFailed(true);
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export">
      <Button variant="secondary" onClick={() => saveFile(json(data), fileName)}>
        <Download size={15} aria-hidden />
        Export JSON
      </Button>
      <Button variant="secondary" disabled={!!busy} onClick={() => void exportAs('pptx')}>
        {busy === 'pptx' ? 'Preparing…' : 'PowerPoint'}
      </Button>
      <Button variant="secondary" disabled={!!busy} onClick={() => void exportAs('pdf')}>
        {busy === 'pdf' ? 'Preparing…' : 'PDF'}
      </Button>
      {failed && (
        <span role="alert" className="text-tiny text-destructive">
          The export could not be created. Try again.
        </span>
      )}
    </div>
  );
}
