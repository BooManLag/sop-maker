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
  control: {
    documentId: 'SOP-P1',
    versionDate: '2026-10-15',
    approved: false,
    published: false,
  },
  revisions: [
    {
      version: 1,
      date: '2026-10-15',
      status: 'Draft',
      change: 'First issue, captured from expert walkthrough',
    },
  ],
  labels: ['DRAFT', 'DEMO'],
  steps: [
    {
      id: 's1',
      number: 1,
      action: 'Isolate the supply',
      details: [{ label: 'Warning', text: 'Line may be pressurized' }],
      hasImage: true,
      required: true,
      validated: false,
    },
    {
      id: 's2',
      number: 2,
      action: 'Wait 3–5 minutes',
      details: [],
      hasImage: false,
      required: false,
      duration: '3–5 min',
      validated: false,
    },
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
test('the PDF is a controlled SOP document with the same steps and labels as the deck', async () => {
  const pdf = await pdfText();
  for (const expected of [
    'STANDARD OPERATING PROCEDURE',
    'Valve Replacement',
    'Valve X',
    'SOP-P1',
    'Awaiting approval',
    'PURPOSE',
    'SCOPE',
    'SAFETY AND WARNINGS',
    'PROCEDURE',
    'Isolate the supply',
    'Line may be pressurized',
    'Wait 3',
    'Optional',
    'REFERENCES',
    'Finding f1',
    'REVISION HISTORY',
    'APPROVAL',
    'Approved by',
    'DRAFT · DEMO',
    'Printed copies are uncontrolled',
  ])
    assert.ok(pdf.includes(expected), expected);
  const pages = pdf.match(/\/Type \/Page(?!s)/g)?.length ?? 0;
  assert.ok(pages >= 1);
  assert.ok(pdf.includes(`Page ${pages} of ${pages}`));
});
test('every page of an unpublished SOP carries the draft watermark and labels', async () => {
  const pdf = await pdfText();
  const pages = pdf.match(/\/Type \/Page(?!s)/g)?.length ?? 0;
  assert.equal(pdf.match(/\(DRAFT\)/g)?.length, pages);
  assert.equal(pdf.match(/DRAFT · DEMO/g)?.length, pages);
});
test('a step image is embedded in the PDF only when the step has one', async () => {
  assert.match(await pdfText(), /\/Subtype \/Image/);
  assert.doesNotMatch(await pdfText({}), /\/Subtype \/Image/);
});

/**
 * Every text line jsPDF wrote, with its baseline height in points from the page bottom. A
 * multi-line block is one positioned line followed by `T*` lines, each a leading lower.
 */
function placedText(pdf: string) {
  const placed: { y: number; text: string }[] = [];
  let y = 0;
  let leading = 0;
  for (const raw of pdf.split('\n')) {
    const tl = raw.match(/^([\d.]+) TL$/);
    if (tl) leading = Number(tl[1]);
    const td = raw.match(/^[\d.-]+ ([\d.-]+) Td$/);
    if (td) y = Number(td[1]);
    const shown = raw.match(/^(T\* )?\((.*)\) Tj$/);
    if (!shown) continue;
    if (shown[1]) y -= leading;
    placed.push({ y, text: shown[2] });
  }
  return placed;
}
/** The footer rule sits 284 mm down an A4 page; only the footer may be drawn below it. */
const footerRulePt = ((297 - 284) * 72) / 25.4;
const sentence = (word: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${word}${i}`).join(' ');

test('a long equipment name is printed in full in the document-control table', async () => {
  const equipment = `${sentence('assembly', 27)} TAILMARKER`;
  assert.ok(equipment.length <= 300);
  const pdf = new TextDecoder('latin1').decode(
    await renderPdf({ ...doc, title: { ...doc.title, equipment } }, {}),
  );
  const lines = placedText(pdf).map((l) => l.text);
  // Under the title, in the control table and in Scope, each time through to the last word.
  assert.equal(lines.filter((l) => l.includes('TAILMARKER')).length, 3);
  for (const word of equipment.split(' ')) assert.ok(pdf.includes(word), word);
});

test('a step longer than a page continues on the next page instead of running off it', async () => {
  const details = (['Use when', 'Why', 'Warning', 'Done when'] as const).map((label) => ({
    label,
    text: `${sentence(label.replace(' ', '').toLowerCase(), 220).slice(0, 1980)} END${label.replace(' ', '')}`,
  }));
  assert.ok(details.every((d) => d.text.length <= 2000));
  const long: SopDocument = {
    ...doc,
    steps: [{ ...doc.steps[0], details }, doc.steps[1]],
  };
  const pdf = new TextDecoder('latin1').decode(await renderPdf(long, { s1: jpeg }));
  const placed = placedText(pdf);
  // jsPDF escapes parentheses inside a text string.
  assert.ok(placed.some((l) => l.text === 'Step 1 \\(continued\\)'));
  for (const d of details) assert.ok(pdf.includes(`END${d.label.replace(' ', '')}`), d.label);
  const body = placed.filter(
    (l) => !l.text.startsWith('Printed copies') && !/^Page \d+ of \d+$/.test(l.text),
  );
  const intruders = body.filter((l) => l.y < footerRulePt);
  assert.deepEqual(intruders, []);
});
