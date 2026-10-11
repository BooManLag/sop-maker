'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function downloadJson(data: unknown, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ data, fileName }: { data: unknown; fileName: string }) {
  return (
    <Button variant="secondary" onClick={() => downloadJson(data, fileName)}>
      <Download size={15} aria-hidden />
      Export
    </Button>
  );
}
