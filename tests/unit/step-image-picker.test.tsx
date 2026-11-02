import { cleanupDom } from '../support/dom';
import { after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StepImagePicker } from '../../src/features/capture/step-image-picker';
import type { ProcessStep } from '../../src/lib/domain/types';

after(() => cleanupDom());
afterEach(() => cleanup());

const step: ProcessStep = {
  id: 'a',
  sequence: 1,
  action: 'Isolate supply',
  required: true,
  source: 'expert_walkthrough',
  frameAtMs: 4000,
};
function renderPicker(overrides: Partial<Parameters<typeof StepImagePicker>[0]> = {}) {
  const calls = { retry: 0, uploads: [] as [number, string][] };
  render(
    <StepImagePicker
      step={step}
      label="Step 1"
      canCapture={false}
      busy={false}
      onCapture={() => undefined}
      onRetry={() => calls.retry++}
      onUpload={(atMs, file) => calls.uploads.push([atMs, file.name])}
      onRemove={() => undefined}
      onWaive={() => undefined}
      {...overrides}
    />,
  );
  return calls;
}

test('a step without a picture offers a retry even when the video has not loaded', () => {
  const calls = renderPicker();
  screen.getByText('No picture yet');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  assert.equal(calls.retry, 1);
});

test('the no-picture mark cannot change while an image is saving', () => {
  renderPicker({ busy: true });
  assert.equal(
    (screen.getByRole('checkbox', { name: 'No picture needed' }) as HTMLInputElement).disabled,
    true,
  );
});

test('a taken photo and an uploaded image both reach the step at its moment', () => {
  const calls = renderPicker();
  const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
  const upload = new File(['y'], 'upload.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Take photo'), { target: { files: [photo] } });
  fireEvent.change(screen.getByLabelText('Upload image'), { target: { files: [upload] } });
  assert.deepEqual(calls.uploads, [
    [4000, 'photo.jpg'],
    [4000, 'upload.png'],
  ]);
});
