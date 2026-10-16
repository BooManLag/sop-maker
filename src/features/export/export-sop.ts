import type { ProcessDto } from '@/lib/client/api';
import type { ProcessStep } from '@/lib/domain/types';
import { buildSopDocument } from './sop-document';
import type { StepImages } from './images';

export type ExportFormat = 'pptx' | 'pdf';

/** What a page hands over so its SOP can be exported. */
export interface ExportableSop {
  process: ProcessDto;
  /** Reviewed steps that replace the stored ones, when the page is editing them. */
  steps?: ProcessStep[];
  demo: boolean;
  /** Signed links to step images, keyed by step id. */
  stills: Record<string, string>;
}

const mimeTypes: Record<ExportFormat, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};

/** Renders the SOP as a deck or a PDF; the renderers load only when someone exports. */
export async function exportSop(format: ExportFormat, sop: ExportableSop) {
  const doc = buildSopDocument(sop.process, {
    demo: sop.demo,
    generatedAt: new Date(),
    steps: sop.steps,
  });
  const images = await fetchImages(
    doc.steps.filter((s) => s.hasImage).map((s) => s.id),
    sop.stills,
  );
  const bytes =
    format === 'pptx'
      ? await (await import('./pptx')).renderPptx(doc, images)
      : await (await import('./pdf')).renderPdf(doc, images);
  return {
    blob: new Blob([bytes as BlobPart], { type: mimeTypes[format] }),
    fileName: `${doc.fileName}.${format}`,
  };
}

/** Step images that can be fetched; one that fails is left out rather than failing the export. */
async function fetchImages(stepIds: string[], stills: Record<string, string>) {
  const images: StepImages = {};
  await Promise.all(
    stepIds.map(async (id) => {
      const response = stills[id] ? await fetch(stills[id]).catch(() => undefined) : undefined;
      if (response?.ok) images[id] = new Uint8Array(await response.arrayBuffer());
    }),
  );
  return images;
}
