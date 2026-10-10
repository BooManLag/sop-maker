'use client';

import { EmptyState } from '@/components/page/empty-state';
import { QueryState } from '@/components/page/query-state';
import { useProcess } from '@/lib/client/queries';
import type { ProcessDto } from '@/lib/client/api';
import type { ReactNode } from 'react';
import { StepEditor } from './step-editor';

/** Loads the draft; a published process can no longer be edited through this flow. */
export function WithDraft({
  processId,
  children,
}: {
  processId: string;
  children: (draft: ProcessDto) => ReactNode;
}) {
  return (
    <QueryState query={useProcess(processId)}>
      {(process) =>
        process.currentVersion > 0 ? (
          <EmptyState
            title="This SOP is already published."
            description="Changes to a published baseline go through a reviewed change request."
          />
        ) : (
          children(process)
        )
      }
    </QueryState>
  );
}

export function DraftSteps(props: { processId: string; captureId: string; sample: boolean }) {
  return (
    <WithDraft processId={props.processId}>
      {(draft) => <StepEditor {...props} initialSteps={draft.versions[0].steps} />}
    </WithDraft>
  );
}
