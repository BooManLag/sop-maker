import type {
  ChangeRequest,
  Finding,
  MediaContentType,
  StepImageLinks,
  ProcessStep,
  ProcessVersion,
  Readiness,
  TechnicianResponse,
  TrialResult,
  ValidationTrial,
} from '../domain/types';

export type ProcessDto = {
  id: string;
  title: string;
  equipment: string;
  currentVersion: number;
  versions: (Omit<ProcessVersion, 'approvedBy'> & { approved: boolean })[];
  archivedAt?: string;
};
/** A draft is deleted outright; a published or referenced process is archived. */
export type ProcessDeletion = { id: string; outcome: 'deleted' | 'archived' };
export type Workspace = {
  processes: ProcessDto[];
  findings: Finding[];
  trials: ValidationTrial[];
  changes: ChangeRequest[];
  demo: boolean;
  /** The signed-in person's organization and role, as the server decided them. */
  organization: string;
  role: 'viewer' | 'expert' | 'reviewer' | 'admin';
};
export type TranscriptSegment = { startMs: number; endMs: number; text: string };
export type DraftCapture = {
  id: string;
  processId: string;
  questions: string[];
  answers: { question: string; answer: string }[];
  /** Present for recordings only. */
  kind: 'text' | 'video' | 'audio' | 'document';
  status?: 'awaiting_upload' | 'transcribed' | 'rejected' | 'failed';
  /** Why a recording was rejected, safe to show. */
  rejection?: string;
  segments?: TranscriptSegment[];
  durationMs?: number;
};
export type UploadTarget = {
  uploadId: string;
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
};
export type RecordingUpload = {
  expertReference: string;
  contentType: MediaContentType;
  bytes: number;
  /** Everyone in the recording agreed to be recorded. */
  consent: true;
};
/** Short-lived read links for a process's step images and, while drafting, its recording. */
export type MediaLinks = {
  frames: StepImageLinks;
  video?: { captureId: string; url: string; contentType: MediaContentType };
};
export type FrameUpload = { captureId: string; stepId: string; atMs: number; bytes: number };
export type Extraction = { steps: ProcessStep[]; questions: string[]; notice: string };
export type ScanDetail = {
  id: string;
  processId: string;
  demo: boolean;
  status: 'uploaded' | 'ready' | 'analyzing' | 'failed' | 'complete';
  recordCount: number;
  readiness?: Readiness;
  funnel?: number[];
};
export type TrialDetail = ValidationTrial & { result?: TrialResult; finding: Finding };
/** A finding with a few of the job notes behind it, while the imported records are kept. */
export type FindingDetail = Finding & { examples: string[] };
export type ChangeRequestDetail = ChangeRequest & { trial: TrialDetail };
export type ServiceRecord = Record<string, string | number | boolean>;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type ClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Firebase ID token for production; omitted in the loopback demo. */
  getToken?: () => Promise<string | undefined>;
};

export function createApiClient({
  baseUrl = '/api/v1',
  fetch: send = (...args) => fetch(...args),
  getToken = async () => undefined,
}: ClientOptions = {}) {
  type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
  async function request<T>(path: string, method: Method, body?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = await getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (method !== 'GET') headers.set('Idempotency-Key', crypto.randomUUID());
    const response = await send(`${baseUrl}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiRequestError(
        payload.error ?? 'Something went wrong. Try again.',
        response.status,
        payload.code,
        payload.requestId,
      );
    return payload as T;
  }
  const get = <T>(path: string) => request<T>(path, 'GET');
  const post = <T>(path: string, body: unknown = {}) => request<T>(path, 'POST', body);
  const patch = <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body);
  const del = <T>(path: string) => request<T>(path, 'DELETE');

  return {
    workspace: () => get<Workspace>('workspace'),

    process: (id: string) => get<ProcessDto>(`processes/${id}`),
    createProcess: (body: { title: string; equipment: string }) =>
      post<ProcessDto>('processes', body),
    updateProcess: (id: string, body: { title?: string; equipment?: string }) =>
      patch<ProcessDto>(`processes/${id}`, body),
    deleteProcess: (id: string) => del<ProcessDeletion>(`processes/${id}`),
    /** Admins only: removes the process and everything recorded against it, for good. */
    purgeProcess: (id: string, title: string) =>
      post<ProcessDeletion>(`processes/${id}/purge`, { title }),
    createCapture: (
      processId: string,
      body: { kind: 'text'; expertReference: string; text: string },
    ) => post<{ id: string }>(`processes/${processId}/captures`, body),
    analyzeCapture: (processId: string, body: { captureId: string }) =>
      post<Extraction>(`processes/${processId}/analyze-capture`, body),
    capture: (id: string) => get<DraftCapture>(`captures/${id}`),
    requestUpload: (processId: string, body: RecordingUpload) =>
      post<UploadTarget>(`processes/${processId}/uploads`, body),
    /** Tells the server the upload finished; it checks storage before transcribing. */
    media: (processId: string) => get<MediaLinks>(`processes/${processId}/media`),
    requestFrame: (processId: string, body: FrameUpload) =>
      post<UploadTarget>(`processes/${processId}/frames`, body),
    completeUpload: (captureId: string) => post<DraftCapture>(`captures/${captureId}/uploaded`, {}),
    saveTranscript: (captureId: string, segments: TranscriptSegment[]) =>
      post<DraftCapture>(`captures/${captureId}/transcript`, { segments }),
    saveDraft: (processId: string, steps: ProcessStep[]) =>
      post<ProcessDto>(`processes/${processId}/draft`, { steps }),
    answerClarification: (
      processId: string,
      body: { captureId: string; stepId: string; question: string; answer: string },
    ) => post<unknown>(`processes/${processId}/clarifications`, body),
    publish: (processId: string, steps: ProcessStep[]) =>
      post<ProcessDto>(`processes/${processId}/publish`, { steps }),

    createScan: (body: { processId: string; demo: boolean; rows?: ServiceRecord[] }) =>
      post<{ id: string }>('scans', body),
    scan: (id: string) => get<ScanDetail>(`scans/${id}`),
    checkReadiness: (scanId: string) => post<Readiness>(`scans/${scanId}/readiness`),
    runScan: (scanId: string) =>
      post<{ id: string; status: 'analyzing' | 'complete'; funnel?: number[] }>(
        `scans/${scanId}/run`,
      ),

    finding: (id: string) => get<FindingDetail>(`findings/${id}`),
    dismissFinding: (id: string) => post<Finding>(`findings/${id}/dismiss`),
    restoreFinding: (id: string) => post<Finding>(`findings/${id}/restore`),
    recordExplanation: (id: string, body: Omit<TechnicianResponse, 'id' | 'findingId'>) =>
      post<TechnicianResponse>(`findings/${id}/request-explanation`, body),

    trial: (id: string) => get<TrialDetail>(`trials/${id}`),
    createTrial: (body: { findingId: string; equipment: string; testGroup: string }) =>
      post<ValidationTrial>('trials', body),
    loadSampleResult: (trialId: string) =>
      post<TrialResult>(`trials/${trialId}/results`, { sample: true }),

    changeRequest: (id: string) => get<ChangeRequestDetail>(`change-requests/${id}`),
    proposeChange: (trialId: string) => post<ChangeRequest>('change-requests', { trialId }),
    submitChange: (id: string, proposedStep: string) =>
      post<ChangeRequest>(`change-requests/${id}/submit`, { proposedStep }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
