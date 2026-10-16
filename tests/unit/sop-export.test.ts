import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import type { SopDocument } from '../../src/features/export/sop-document';
import { renderPptx } from '../../src/features/export/pptx';
import { renderPdf } from '../../src/features/export/pdf';
import type { StepImages } from '../../src/features/export/images';

const doc: SopDocument = {
  title: {
    title: 'Valve Replacement',
    equipment: 'Valve X',
    version: 'Draft',
    approval: 'Awaiting approval',
    generatedAt: '2026-10-16 09:30 UTC',
    evidence: ['Finding f1'],
  },
  labels: ['DRAFT', 'DEMO'],
  steps: [
    {
      id: 's1',
      number: 1,
      action: 'Isolate the supply',
      details: [{ label: 'Warning', text: 'Line may be pressurized' }],
      hasImage: true,
    },
    { id: 's2', number: 2, action: 'Wait 3–5 minutes', details: [], hasImage: false },
  ],
  fileName: 'valve-replacement-draft',
};
/** A JPEG header declaring a 2×1 image: start of image, a baseline frame, end of image. */
const jpeg = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x02, 0x03, 0x01, 0x22, 0x00, 0x02,
  0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);

test('the deck has a title slide and one slide per step, each labelled', async () => {
  const zip = await JSZip.loadAsync(await renderPptx(doc, { s1: jpeg }));
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.equal(slides.length, 3);
  const text = async (n: number) => zip.file(`ppt/slides/slide${n}.xml`)!.async('string');
  const title = await text(1);
  for (const expected of [
    'Valve Replacement',
    'Valve X',
    'Draft',
    'Awaiting approval',
    'Finding f1',
    'DRAFT · DEMO',
  ])
    assert.ok(title.includes(expected), expected);
  const first = await text(2);
  for (const expected of [
    'Isolate the supply',
    'Warning',
    'Line may be pressurized',
    'DRAFT · DEMO',
  ])
    assert.ok(first.includes(expected), expected);
  assert.ok((await text(3)).includes('Wait 3–5 minutes'));
});
test('a step image is embedded in its slide; steps without one have none', async () => {
  const zip = await JSZip.loadAsync(await renderPptx(doc, { s1: jpeg }));
  const rels = async (n: number) =>
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)!.async('string');
  assert.match(await rels(2), /media\/image/);
  assert.doesNotMatch(await rels(3), /media\/image/);
});

const pdfText = async (images: StepImages = { s1: jpeg }) =>
  new TextDecoder('latin1').decode(await renderPdf(doc, images));
test('the PDF has the same pages, text and labels as the deck', async () => {
  const pdf = await pdfText();
  assert.equal(pdf.match(/\/Type \/Page(?!s)/g)?.length, 3);
  for (const expected of [
    'Valve Replacement',
    'Valve X',
    'Awaiting approval',
    'Finding f1',
    'Isolate the supply',
    'Line may be pressurized',
  ])
    assert.ok(pdf.includes(expected), expected);
  assert.equal(pdf.match(/DRAFT/g)?.length, 3);
});
test('a step image is embedded in the PDF only when the step has one', async () => {
  assert.match(await pdfText(), /\/Subtype \/Image/);
  assert.doesNotMatch(await pdfText({}), /\/Subtype \/Image/);
});
