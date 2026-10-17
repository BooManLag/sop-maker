import { GState, jsPDF } from 'jspdf';
import type { SopDocument, SopPage } from './sop-document';
import { jpegDataUri, labelLine, type StepImages } from './images';

type Rgb = [number, number, number];
/** Portrait A4 in millimetres. */
const page = { width: 210, height: 297, margin: 16 };
const content = { left: page.margin, right: page.width - page.margin, top: 30, bottom: 278 };
const ink: Rgb = [31, 42, 28];
const muted: Rgb = [107, 119, 102];
const rule: Rgb = [214, 220, 210];
const band: Rgb = [242, 245, 240];
const brand: Rgb = [46, 92, 58];
const warning: Rgb = [161, 92, 0];
const warningSurface: Rgb = [253, 244, 228];
/** Procedure table columns: step number, instruction (with picture), sign-off box. */
const columns = { number: 14, check: 16 };
const picture = { width: 62, height: 46 };

/**
 * The SOP as a controlled document for print: a header and footer on every page, a
 * document-control table, purpose and scope, the safety warnings gathered in one place, the
 * procedure as a numbered table with pictures and sign-off boxes, revision history and an
 * approval block. Built from the same model as the deck.
 */
export async function renderPdf(doc: SopDocument, images: StepImages): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: doc.title.title, subject: 'Standard operating procedure' });
  const writer = new Writer(pdf);
  drawCover(writer, doc);
  drawPurposeAndScope(writer, doc);
  drawSafety(writer, doc);
  drawProcedure(writer, doc, images);
  drawReferences(writer, doc);
  drawRevisions(writer, doc);
  drawApproval(writer, doc);
  finishPages(pdf, doc);
  return new Uint8Array(pdf.output('arraybuffer'));
}

/** Tracks the cursor and starts a new page when the next block will not fit. */
class Writer {
  y = content.top;
  constructor(readonly pdf: jsPDF) {}
  ensure(height: number, onNewPage?: () => void) {
    if (this.y + height <= content.bottom) return;
    this.newPage(onNewPage);
  }
  newPage(onNewPage?: () => void) {
    this.pdf.addPage();
    this.y = content.top;
    onNewPage?.();
  }
  /** `keepWith` is the height of what must follow on the same page, so a heading is never orphaned. */
  heading(number: number, text: string, keepWith = 12) {
    this.ensure(14 + Math.min(keepWith, content.bottom - content.top - 14));
    this.y += 4;
    setText(this.pdf, 12, true, brand);
    this.pdf.text(`${number}.  ${text.toUpperCase()}`, content.left, this.y, { baseline: 'top' });
    this.y += 6;
    line(this.pdf, content.left, this.y, content.right, this.y, brand, 0.4);
    this.y += 4;
  }
  paragraph(
    text: string,
    options: { size?: number; color?: Rgb; x?: number; width?: number } = {},
  ) {
    const lines = wrap(this.pdf, text, options.width ?? content.right - content.left, options.size);
    const height = lines.length * lineHeight(options.size ?? 10);
    this.ensure(height);
    setText(this.pdf, options.size ?? 10, false, options.color ?? ink);
    this.pdf.text(lines, options.x ?? content.left, this.y, { baseline: 'top' });
    this.y += height + 2;
  }
}

function drawCover(w: Writer, doc: SopDocument) {
  const { pdf } = w;
  setText(pdf, 9, true, brand);
  pdf.text('STANDARD OPERATING PROCEDURE', content.left, w.y, {
    baseline: 'top',
    charSpace: 0.6,
  });
  w.y += 7;
  const title = wrap(pdf, doc.title.title, content.right - content.left, 22, true);
  setText(pdf, 22, true, ink);
  pdf.text(title, content.left, w.y, { baseline: 'top' });
  w.y += title.length * lineHeight(22) + 1;
  setText(pdf, 12, false, muted);
  const equipment = wrap(pdf, doc.title.equipment, content.right - content.left, 12);
  setText(pdf, 12, false, muted);
  pdf.text(equipment, content.left, w.y, { baseline: 'top' });
  w.y += equipment.length * lineHeight(12) + 5;

  const rows: [string, string][] = [
    ['Document ID', doc.control.documentId],
    ['Version', doc.control.published ? doc.title.version.replace('Version ', '') : 'Draft'],
    ['Status', doc.title.approval],
    ['Version date', doc.control.versionDate],
    ['Equipment / job', doc.title.equipment],
    ['Steps', `${doc.steps.length} (${doc.steps.filter((s) => s.required).length} required)`],
    ['Generated', doc.title.generatedAt],
  ];
  const labelWidth = 38;
  const half = (content.right - content.left) / 2;
  const valueWidth = half - labelWidth - 5;
  for (let i = 0; i < rows.length; i += 2) {
    // Every value is shown in full; a long one makes its row taller rather than being cut.
    const pair = rows.slice(i, i + 2).map(([label, value]) => ({
      label,
      lines: wrap(pdf, value, valueWidth, 9.5, label === 'Status'),
    }));
    const rowHeight = Math.max(8, ...pair.map((cell) => cell.lines.length * lineHeight(9.5) + 4));
    w.ensure(rowHeight);
    for (let col = 0; col < 2; col++) {
      const cell = pair[col];
      const x = content.left + col * half;
      pdf.setDrawColor(...rule);
      pdf.setLineWidth(0.2);
      pdf.setFillColor(...band);
      pdf.rect(x, w.y, labelWidth, rowHeight, 'FD');
      pdf.rect(x + labelWidth, w.y, half - labelWidth, rowHeight, 'S');
      if (!cell) continue;
      setText(pdf, 8, true, muted);
      pdf.text(cell.label, x + 2.5, w.y + 4, { baseline: 'middle' });
      setText(pdf, 9.5, cell.label === 'Status', statusColor(doc, cell.label));
      pdf.text(cell.lines, x + labelWidth + 2.5, w.y + 2, { baseline: 'top' });
    }
    w.y += rowHeight;
  }
  w.y += 4;
}
const statusColor = (doc: SopDocument, label: string): Rgb =>
  label === 'Status' ? (doc.control.approved ? brand : warning) : ink;

function drawPurposeAndScope(w: Writer, doc: SopDocument) {
  const { title, steps } = doc;
  w.heading(1, 'Purpose');
  w.paragraph(
    `This procedure sets out how to carry out "${title.title}" so that the job is done the same ` +
      'way every time. The steps were captured from an expert walkthrough and ' +
      (doc.control.approved
        ? 'approved by a reviewer before publication.'
        : 'have not yet been approved by a reviewer.'),
  );
  w.heading(2, 'Scope');
  const optional = steps.filter((s) => !s.required).length;
  w.paragraph(
    `Applies to ${title.equipment}. The procedure has ${steps.length} step${steps.length === 1 ? '' : 's'}` +
      (optional
        ? `, of which ${optional} ${optional === 1 ? 'is' : 'are'} optional.`
        : '; all are required.') +
      ' Follow the steps in order and sign off each one as it is completed.',
  );
}

function drawSafety(w: Writer, doc: SopDocument) {
  const warnings = doc.steps.flatMap((step) =>
    step.details
      .filter((d) => d.label === 'Warning')
      .map((d) => ({ step: step.number, text: d.text })),
  );
  const textX = content.left + 34;
  const boxHeight = (text: string) =>
    Math.max(10, wrap(w.pdf, text, content.right - textX - 4, 10).length * lineHeight(10) + 5);
  w.heading(3, 'Safety and warnings', warnings.length ? boxHeight(warnings[0].text) + 2 : 12);
  if (!warnings.length) {
    w.paragraph('No step-specific warnings were recorded. Follow your site safety rules.', {
      color: muted,
    });
    return;
  }
  const { pdf } = w;
  for (const item of warnings) {
    const lines = wrap(pdf, item.text, content.right - textX - 4, 10);
    const height = Math.max(10, lines.length * lineHeight(10) + 5);
    w.ensure(height + 2);
    pdf.setFillColor(...warningSurface);
    pdf.setDrawColor(...warning);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(content.left, w.y, content.right - content.left, height, 1.5, 1.5, 'FD');
    drawWarningSign(pdf, content.left + 7, w.y + height / 2);
    setText(pdf, 9, true, warning);
    pdf.text(`Step ${item.step}`, content.left + 14, w.y + 2.8, { baseline: 'top' });
    setText(pdf, 10, false, ink);
    pdf.text(lines, textX, w.y + 2.5, { baseline: 'top' });
    w.y += height + 2;
  }
}

function drawProcedure(w: Writer, doc: SopDocument, images: StepImages) {
  const opening = doc.steps[0] && images[doc.steps[0].id] ? picture.height : 12;
  w.heading(4, 'Procedure', 7 + opening + 2 * cellPadding);
  const { pdf } = w;
  const tableWidth = content.right - content.left;
  const header = () => {
    pdf.setFillColor(...brand);
    pdf.rect(content.left, w.y, tableWidth, 7, 'F');
    setText(pdf, 8, true, [255, 255, 255]);
    pdf.text('STEP', content.left + columns.number / 2, w.y + 3.5, {
      align: 'center',
      baseline: 'middle',
    });
    pdf.text('INSTRUCTION', content.left + columns.number + 3, w.y + 3.5, { baseline: 'middle' });
    pdf.text('DONE', content.right - columns.check / 2, w.y + 3.5, {
      align: 'center',
      baseline: 'middle',
    });
    w.y += 7;
  };
  w.ensure(30);
  header();
  for (const step of doc.steps) {
    drawStep(w, step, header, images[step.id]);
  }
  w.y += 4;
}

const cellPadding = 4;
const detailLabelWidth = 22;
const bodyX = content.left + columns.number + 3;
/** Instruction text width: the whole column, or what is left beside the step picture. */
const fullWidth = content.right - content.left - columns.number - columns.check - 6;
const besidePicture = fullWidth - picture.width - 4;
const detail = { size: 9.5, leading: 1.4 };

/**
 * Draws one step row. Text runs beside the picture only until it clears it, then uses the
 * whole instruction column, so long instructions stay readable. A step too long for the rest
 * of the page closes its row there and continues on the next page under a repeated table
 * header, marked as continued, so nothing is cut off or drawn over the footer.
 */
function drawStep(w: Writer, step: SopPage, header: () => void, jpeg?: Uint8Array) {
  const { pdf } = w;
  const fitted = jpeg ? fitPicture(pdf, jpeg) : undefined;
  w.ensure(Math.max(fitted?.height ?? 0, 10) + 2 * cellPadding, header);
  let top = w.y;
  let y = top + cellPadding;
  let first = true;
  let pictureBottom = 0;
  if (jpeg && fitted) {
    drawPicture(pdf, jpeg, fitted, y);
    pictureBottom = y + fitted.height;
  }
  const widthAt = (at: number) => (at < pictureBottom ? besidePicture : fullWidth);

  /** Makes room for a line; returns true when that meant starting a new page. */
  const room = (height: number) => {
    if (y + height <= content.bottom - cellPadding) return false;
    drawStepFrame(pdf, step, top, Math.max(y, pictureBottom) + cellPadding - top, first);
    first = false;
    pictureBottom = 0;
    w.newPage(header);
    top = w.y;
    y = top + cellPadding;
    setText(pdf, 8, false, muted);
    pdf.text(`Step ${step.number} (continued)`, bodyX, y, { baseline: 'top' });
    y += lineHeight(8) + 2;
    return true;
  };

  /** Flows text line by line at the width available where each line lands. */
  const flow = (
    text: string,
    style: { size: number; bold: boolean; color: Rgb; indent?: number; leading?: number },
    onLine?: (y: number, kind: 'first' | 'continued' | 'more') => void,
  ) => {
    const indent = style.indent ?? 0;
    const height = lineHeight(style.size, style.leading);
    let firstLine = true;
    for (const paragraph of text.split(/\r?\n/)) {
      let words = paragraph.split(/\s+/).filter(Boolean);
      while (words.length) {
        const broke = room(height);
        setText(pdf, style.size, style.bold, style.color);
        const fitted = fitLine(pdf, words, widthAt(y) - indent);
        onLine?.(y, firstLine ? 'first' : broke ? 'continued' : 'more');
        setText(pdf, style.size, style.bold, style.color);
        pdf.text(fitted.line, bodyX + indent, y, { baseline: 'top' });
        words = fitted.rest;
        y += height;
        firstLine = false;
      }
    }
  };

  flow(step.action, { size: 11, bold: true, color: ink });
  const tags = [
    step.required ? undefined : 'Optional',
    step.duration && `Expected time: ${step.duration}`,
    step.validated ? 'Validated in a field trial' : undefined,
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (tags) {
    y += 1;
    flow(tags, { size: 8, bold: false, color: step.validated ? brand : muted });
  }
  step.details.forEach((item, i) => {
    y += i === 0 ? 2.5 : 2;
    const isWarning = item.label === 'Warning';
    const color = isWarning ? warning : ink;
    flow(
      item.text,
      { size: detail.size, bold: false, color, indent: detailLabelWidth, leading: detail.leading },
      (lineY, kind) => {
        if (kind !== 'more') {
          setText(pdf, 7.5, true, isWarning ? warning : muted);
          pdf.text(
            kind === 'continued' ? `${item.label.toUpperCase()} (CONT.)` : item.label.toUpperCase(),
            bodyX,
            lineY + 0.6,
            { baseline: 'top', maxWidth: detailLabelWidth - 1 },
          );
        }
      },
    );
  });
  const bottom = Math.max(y, pictureBottom, top + 10) + cellPadding;
  drawStepFrame(pdf, step, top, bottom - top, first);
  w.y = bottom;
}

/** The words that fit on one line, and the rest; a word wider than the line is split. */
function fitLine(pdf: jsPDF, words: string[], width: number) {
  let line = '';
  let count = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (pdf.getTextWidth(candidate) > width && line) break;
    line = candidate;
    count++;
    if (pdf.getTextWidth(line) > width) {
      // A single over-long word: keep what fits and carry the remainder to the next line.
      let cut = word.length;
      while (cut > 1 && pdf.getTextWidth(word.slice(0, cut)) > width) cut--;
      return { line: word.slice(0, cut), rest: [word.slice(cut), ...words.slice(count)] };
    }
  }
  return { line, rest: words.slice(count) };
}

/** Row borders, the step number and, on the row's first part, the sign-off box. */
function drawStepFrame(pdf: jsPDF, step: SopPage, top: number, height: number, first: boolean) {
  const x = content.left;
  pdf.setDrawColor(...rule);
  pdf.setLineWidth(0.2);
  pdf.rect(x, top, content.right - content.left, height, 'S');
  line(pdf, x + columns.number, top, x + columns.number, top + height, rule, 0.2);
  line(
    pdf,
    content.right - columns.check,
    top,
    content.right - columns.check,
    top + height,
    rule,
    0.2,
  );
  pdf.setFillColor(...(first ? brand : muted));
  pdf.circle(x + columns.number / 2, top + 7, 4, 'F');
  setText(pdf, 10, true, [255, 255, 255]);
  pdf.text(String(step.number), x + columns.number / 2, top + 7, {
    align: 'center',
    baseline: 'middle',
  });
  if (!first) return;
  const box = 6;
  pdf.setDrawColor(...muted);
  pdf.setLineWidth(0.35);
  pdf.rect(content.right - columns.check / 2 - box / 2, top + cellPadding, box, box, 'S');
}

function drawPicture(
  pdf: jsPDF,
  jpeg: Uint8Array,
  size: { width: number; height: number },
  y: number,
) {
  const x = content.right - columns.check - 3 - picture.width + (picture.width - size.width) / 2;
  pdf.addImage(jpegDataUri(jpeg), 'JPEG', x, y, size.width, size.height, undefined, 'FAST');
  pdf.setDrawColor(...rule);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, size.width, size.height, 'S');
}

/** Scales a picture into the column, keeping its aspect ratio. */
function fitPicture(pdf: jsPDF, jpeg: Uint8Array) {
  try {
    const { width, height } = pdf.getImageProperties(jpegDataUri(jpeg));
    if (width > 0 && height > 0) {
      const scale = Math.min(picture.width / width, picture.height / height);
      return { width: width * scale, height: height * scale };
    }
  } catch {
    // An unreadable header still embeds at the column's default proportions.
  }
  return { ...picture };
}

function drawReferences(w: Writer, doc: SopDocument) {
  if (!doc.title.evidence.length) return;
  w.heading(5, 'References');
  for (const reference of doc.title.evidence) w.paragraph(`•  ${reference}`);
}

function drawRevisions(w: Writer, doc: SopDocument) {
  w.heading(doc.title.evidence.length ? 6 : 5, 'Revision history');
  const { pdf } = w;
  const cols = [
    { label: 'VERSION', width: 22 },
    { label: 'DATE', width: 28 },
    { label: 'STATUS', width: 36 },
    { label: 'CHANGE', width: content.right - content.left - 86 },
  ];
  const row = (cells: string[], heading: boolean) => {
    const lines = cells.map((cell, i) => wrap(pdf, cell, cols[i].width - 4, heading ? 8 : 9));
    const height = Math.max(...lines.map((l) => l.length)) * lineHeight(heading ? 8 : 9) + 4;
    w.ensure(height);
    let x = content.left;
    if (heading) {
      pdf.setFillColor(...band);
      pdf.rect(x, w.y, content.right - content.left, height, 'F');
    }
    pdf.setDrawColor(...rule);
    pdf.setLineWidth(0.2);
    pdf.rect(x, w.y, content.right - content.left, height, 'S');
    lines.forEach((cellLines, i) => {
      setText(pdf, heading ? 8 : 9, heading, heading ? muted : ink);
      pdf.text(cellLines, x + 2, w.y + 2, { baseline: 'top' });
      x += cols[i].width;
    });
    w.y += height;
  };
  row(
    cols.map((c) => c.label),
    true,
  );
  for (const revision of doc.revisions)
    row([`v${revision.version}`, revision.date, revision.status, revision.change], false);
  w.y += 4;
}

function drawApproval(w: Writer, doc: SopDocument) {
  w.heading(doc.title.evidence.length ? 7 : 6, 'Approval');
  const { pdf } = w;
  w.paragraph(
    doc.control.approved
      ? 'This version was approved in Good Exception. Sign below for local document control.'
      : 'This version is not approved. It must not be used as the standard until a reviewer approves it.',
    { color: doc.control.approved ? ink : warning },
  );
  const roles = ['Prepared by', 'Reviewed by', 'Approved by'];
  const cols = [
    { label: 'ROLE', width: 34 },
    { label: 'NAME', width: 52 },
    { label: 'SIGNATURE', width: 52 },
    { label: 'DATE', width: content.right - content.left - 138 },
  ];
  w.ensure(7 + roles.length * 12);
  let x = content.left;
  pdf.setFillColor(...band);
  pdf.rect(content.left, w.y, content.right - content.left, 7, 'F');
  for (const col of cols) {
    setText(pdf, 8, true, muted);
    pdf.text(col.label, x + 2, w.y + 3.5, { baseline: 'middle' });
    x += col.width;
  }
  w.y += 7;
  for (const role of roles) {
    x = content.left;
    pdf.setDrawColor(...rule);
    pdf.setLineWidth(0.2);
    pdf.rect(content.left, w.y, content.right - content.left, 12, 'S');
    for (const col of cols.slice(0, -1)) {
      x += col.width;
      line(pdf, x, w.y, x, w.y + 12, rule, 0.2);
    }
    setText(pdf, 9, true, ink);
    pdf.text(role, content.left + 2, w.y + 6, { baseline: 'middle' });
    w.y += 12;
  }
}

/** Header, footer, page numbers and the draft watermark, once the page count is known. */
function finishPages(pdf: jsPDF, doc: SopDocument) {
  const total = pdf.getNumberOfPages();
  for (let n = 1; n <= total; n++) {
    pdf.setPage(n);
    if (!doc.control.published) {
      pdf.saveGraphicsState();
      pdf.setGState(new GState({ opacity: 0.07 }));
      setText(pdf, 96, true, warning);
      // Rotation pivots on the text's start, so offset it to centre the word on the page.
      const half = pdf.getTextWidth('DRAFT') / 2;
      pdf.text(
        'DRAFT',
        page.width / 2 - half * Math.SQRT1_2,
        page.height / 2 + half * Math.SQRT1_2,
        {
          angle: 45,
          baseline: 'middle',
        },
      );
      pdf.restoreGraphicsState();
    }
    setText(pdf, 8, true, ink);
    const heading = ellipsize(pdf, doc.title.title, 110);
    pdf.text(heading, content.left, 12, { baseline: 'top' });
    setText(pdf, 8, false, muted);
    pdf.text(
      `${doc.control.documentId}  ·  ${doc.title.version}  ·  ${doc.title.approval}`,
      content.left,
      16.5,
      {
        baseline: 'top',
      },
    );
    if (doc.labels.length) {
      setText(pdf, 8, true, warning);
      const label = labelLine(doc);
      const width = pdf.getTextWidth(label) + 6;
      pdf.setFillColor(...warningSurface);
      pdf.setDrawColor(...warning);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(content.right - width, 11, width, 6, 1.2, 1.2, 'FD');
      pdf.text(label, content.right - width / 2, 14, { align: 'center', baseline: 'middle' });
    }
    line(pdf, content.left, 21.5, content.right, 21.5, rule, 0.3);

    line(pdf, content.left, 284, content.right, 284, rule, 0.3);
    setText(pdf, 7.5, false, muted);
    pdf.text(
      `Printed copies are uncontrolled. Check that this is the current version before use.  Generated ${doc.title.generatedAt}`,
      content.left,
      287,
      { baseline: 'top' },
    );
    setText(pdf, 8, true, ink);
    pdf.text(`Page ${n} of ${total}`, content.right, 287, { align: 'right', baseline: 'top' });
  }
}

function drawWarningSign(pdf: jsPDF, cx: number, cy: number) {
  pdf.setFillColor(...warning);
  pdf.triangle(cx, cy - 3.2, cx - 3.6, cy + 2.8, cx + 3.6, cy + 2.8, 'F');
  setText(pdf, 7, true, [255, 255, 255]);
  pdf.text('!', cx, cy + 0.2, { align: 'center', baseline: 'middle' });
}

/** One line for the running header; the cover always shows the full title. */
function ellipsize(pdf: jsPDF, text: string, width: number) {
  const [first, ...rest] = wrap(pdf, text, width, 8, true);
  if (!rest.length) return first;
  let cut = first;
  while (cut && pdf.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function setText(pdf: jsPDF, size: number, bold: boolean, color: Rgb) {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
}
function wrap(pdf: jsPDF, text: string, width: number, size = 10, bold = false) {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  return pdf.splitTextToSize(text, width) as string[];
}
const lineHeight = (size: number, leading = 1.25) => (size * leading * 25.4) / 72;
function line(
  pdf: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Rgb,
  width: number,
) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(width);
  pdf.line(x1, y1, x2, y2);
}
