import PptxGenJS from 'pptxgenjs';
import type { SopDocument, SopPage } from './sop-document';
import { jpegDataUri, labelLine, type StepImages } from './images';

const font = 'Arial';
const ink = '1F2A1C';
const muted = '6B7766';
const warning = 'A15C00';

/** The SOP as an editable 16:9 deck: a title slide, then one slide per step. */
export async function renderPptx(doc: SopDocument, images: StepImages): Promise<Uint8Array> {
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_16x9';
  deck.title = doc.title.title;
  addTitleSlide(deck, doc);
  for (const page of doc.steps) addStepSlide(deck, doc, page, images[page.id]);
  return (await deck.write({ outputType: 'uint8array' })) as Uint8Array;
}

function addTitleSlide(deck: PptxGenJS, doc: SopDocument) {
  const slide = deck.addSlide();
  addLabels(slide, doc);
  const { title } = doc;
  slide.addText(title.title, {
    x: 0.6,
    y: 1.4,
    w: 8.8,
    h: 0.9,
    fontFace: font,
    fontSize: 34,
    bold: true,
    color: ink,
  });
  slide.addText(title.equipment, {
    x: 0.6,
    y: 2.3,
    w: 8.8,
    h: 0.5,
    fontFace: font,
    fontSize: 18,
    color: muted,
  });
  const facts = [
    `${title.version} · ${title.approval}`,
    ...title.evidence,
    `Generated ${title.generatedAt}`,
  ].join('\n');
  slide.addText(facts, {
    x: 0.6,
    y: 3.2,
    w: 8.8,
    h: 1.4,
    fontFace: font,
    fontSize: 13,
    color: muted,
    valign: 'top',
  });
}

function addStepSlide(deck: PptxGenJS, doc: SopDocument, page: SopPage, image?: Uint8Array) {
  const slide = deck.addSlide();
  addLabels(slide, doc);
  const textWidth = image ? 4.6 : 8.8;
  slide.addText(`Step ${page.number}`, {
    x: 0.6,
    y: 0.5,
    w: textWidth,
    h: 0.4,
    fontFace: font,
    fontSize: 12,
    color: muted,
  });
  slide.addText(page.action, {
    x: 0.6,
    y: 0.9,
    w: textWidth,
    h: 1.3,
    fontFace: font,
    fontSize: 24,
    bold: true,
    color: ink,
    valign: 'top',
  });
  if (page.details.length)
    slide.addText(
      page.details.map((detail) => ({
        text: `${detail.label}: ${detail.text}`,
        options: {
          breakLine: true,
          color: detail.label === 'Warning' ? warning : ink,
          paraSpaceAfter: 6,
        },
      })),
      { x: 0.6, y: 2.3, w: textWidth, h: 2.8, fontFace: font, fontSize: 14, valign: 'top' },
    );
  if (image)
    slide.addImage({
      data: jpegDataUri(image),
      x: 5.4,
      y: 0.9,
      w: 4,
      h: 3,
      sizing: { type: 'contain', w: 4, h: 3 },
    });
}

function addLabels(slide: PptxGenJS.Slide, doc: SopDocument) {
  if (!doc.labels.length) return;
  slide.addText(labelLine(doc), {
    x: 6.4,
    y: 0.15,
    w: 3.4,
    h: 0.3,
    fontFace: font,
    fontSize: 11,
    bold: true,
    color: warning,
    align: 'right',
  });
}
