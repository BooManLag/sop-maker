import { cleanupDom } from '../support/dom';
import { after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExportButton } from '../../src/components/common/export-button';
import type { ProcessDto } from '../../src/lib/client/api';

after(() => cleanupDom());
afterEach(() => cleanup());

/** Records each file the button hands to the browser to save. */
function captureDownloads() {
  const saved: { name: string; blob: Blob }[] = [];
  const blobs = new Map<string, Blob>();
  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:test/${blobs.size}`;
    blobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = () => undefined;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, blob: blobs.get(this.href)! });
  };
  return saved;
}
const process: ProcessDto = {
  id: 'p1',
  title: 'Valve Replacement',
  equipment: 'Valve X',
  currentVersion: 1,
  versions: [
    {
      id: 'v1',
      processId: 'p1',
      version: 1,
      status: 'published',
      title: 'Valve Replacement',
      createdAt: '2026-10-01T00:00:00Z',
      approved: true,
      steps: [
        { id: 's1', sequence: 1, action: 'Isolate the supply', required: true, source: 'baseline' },
      ],
    },
  ],
};

test('without an SOP the button exports the page data as JSON, as before', async () => {
  const saved = captureDownloads();
  render(<ExportButton data={{ id: 'c1' }} fileName="sop-change-request.json" />);
  assert.equal(screen.queryByRole('button', { name: /PowerPoint/ }), null);
  fireEvent.click(screen.getByRole('button', { name: /Export/ }));
  assert.equal(saved[0].name, 'sop-change-request.json');
  assert.deepEqual(JSON.parse(await saved[0].blob.text()), { id: 'c1' });
});
test('an SOP can also be exported as PowerPoint or PDF, named after its version', async () => {
  const saved = captureDownloads();
  render(
    <ExportButton
      data={process}
      fileName="living-sop.json"
      sop={{ process, demo: false, stills: {} }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /PowerPoint/ }));
  await waitFor(() => assert.equal(saved.length, 1));
  fireEvent.click(screen.getByRole('button', { name: /PDF/ }));
  await waitFor(() => assert.equal(saved.length, 2));
  assert.deepEqual(
    saved.map((file) => file.name),
    ['valve-replacement-v1.pptx', 'valve-replacement-v1.pdf'],
  );
  assert.ok(saved.every((file) => file.blob.size > 0));
});
