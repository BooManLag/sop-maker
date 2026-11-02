export type DraftStage = 'transcript' | 'steps' | 'clarify' | 'review';

/** URL of a create-SOP stage. */
export function draftPath(processId: string, captureId: string, stage: DraftStage) {
  return `/processes/${processId}/captures/${captureId}/${stage}`;
}
