import type { ServiceRecord } from '../client/api';

const maxBytes = 4_000_000;

type RecordFile = Pick<Blob, 'size' | 'arrayBuffer'>;

/** Reads the first worksheet of a CSV or XLSX export. The XLSX parser loads only when needed. */
export async function readServiceRecords(file: RecordFile): Promise<ServiceRecord[]> {
  if (file.size > maxBytes) throw new Error('Choose a CSV or XLSX file smaller than 4 MB.');
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
  const [firstSheet] = workbook.SheetNames;
  if (!firstSheet) throw new Error('This file contains no worksheets.');
  const rows = XLSX.utils.sheet_to_json<ServiceRecord>(workbook.Sheets[firstSheet], {
    defval: '',
  });
  if (!rows.length) throw new Error('No service records were found.');
  return rows;
}
