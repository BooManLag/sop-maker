export type DraftStage = 'steps' | 'clarify' | 'review';

/** URL of a create-SOP stage; `sample` keeps the guided sample answers available. */
export function draftPath(
  processId: string,
  captureId: string,
  stage: DraftStage,
  sample: boolean,
) {
  return `/processes/${processId}/captures/${captureId}/${stage}${sample ? '?sample=1' : ''}`;
}
