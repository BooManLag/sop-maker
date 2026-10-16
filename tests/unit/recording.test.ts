import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMegabytes } from '../../src/features/capture/recording';

test('file sizes read as whole megabytes when exact, else to one decimal', () => {
  assert.equal(formatMegabytes(100_000_000), '100 MB');
  assert.equal(formatMegabytes(12_345_678), '12.3 MB');
});
