import { jsPDF } from 'jspdf';
import type { SopDocument, SopPage } from './sop-document';
import { jpegDataUri, labelLine, type StepImages } from './images';

/** Landscape A4 in millimetres, laid out like the deck's 16:9 slides. */
const page = { width: 297, height: 210, margin: 18 };
const ink: [number, number, number] = [31, 42, 28];
const muted: [number, number, number] = [107, 119, 102];
const warning: [number, number, number] = [161, 92, 0];
const image = { x: 160, y: 36, width: 119, height: 89 };

/** The SOP for print: a title page, then one page per step, from the same model as the deck. */
export async function renderPdf(doc: SopDocument, images: StepImages): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: doc.title.title });
  drawTitlePage(pdf, doc);
  for (const step of doc.steps) {
    pdf.addPage();
    drawStepPage(pdf, doc, step, images[step.id]);
  }
  return new Uint8Array(pdf.output('arraybuffer'));
}

function drawTitlePage(pdf: jsPDF, doc: SopDocument) {
  drawLabels(pdf, doc);
  const { title } = doc;
  write(pdf, title.title, { y: 70, size: 28, bold: true });
  write(pdf, title.equipment, { y: 84, size: 15, color: muted });
  const facts = [
    `${title.version} · ${title.approval}`,
    ...title.evidence,
    `Generated ${title.generatedAt}`,
  ];
  write(pdf, facts.join('\n'), { y: 104, size: 12, color: muted });
}

function drawStepPage(pdf: jsPDF, doc: SopDocument, step: SopPage, jpeg?: Uint8Array) {
  drawLabels(pdf, doc);
  const width = jpeg ? image.x - page.margin - 8 : page.width - 2 * page.margin;
  write(pdf, `Step ${step.number}`, { y: 30, size: 11, color: muted });
  let y = write(pdf, step.action, { y: 42, size: 20, bold: true, width }) + 6;
  for (const detail of step.details)
    y =
      write(pdf, `${detail.label}: ${detail.text}`, {
        y,
        size: 12,
        width,
        color: detail.label === 'Warning' ? warning : ink,
      }) + 3;
  if (jpeg)
    pdf.addImage(
      jpegDataUri(jpeg),
      'JPEG',
      image.x,
      image.y,
      image.width,
      image.height,
      undefined,
      'FAST',
    );
}

function drawLabels(pdf: jsPDF, doc: SopDocument) {
  if (!doc.labels.length) return;
  write(pdf, labelLine(doc), {
    y: 12,
    size: 10,
    bold: true,
    color: warning,
    x: page.width - page.margin,
    align: 'right',
  });
}

/** Writes wrapped text and returns the y just below it. */
function write(
  pdf: jsPDF,
  text: string,
  options: {
    y: number;
    size: number;
    bold?: boolean;
    color?: [number, number, number];
    width?: number;
    x?: number;
    align?: 'left' | 'right';
  },
) {
  pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
  pdf.setFontSize(options.size);
  pdf.setTextColor(...(options.color ?? ink));
  const lines = pdf.splitTextToSize(
    text,
    options.width ?? page.width - 2 * page.margin,
  ) as string[];
  pdf.text(lines, options.x ?? page.margin, options.y, {
    align: options.align ?? 'left',
    baseline: 'top',
  });
  const lineHeightMm = (options.size * pdf.getLineHeightFactor() * 25.4) / 72;
  return options.y + lines.length * lineHeightMm;
}
