import type {
  ChangeRequest,
  Finding,
  ProcessStep,
  ProcessVersion,
  Readiness,
  TechnicianResponse,
  TrialResult,
  ValidationTrial,
} from '../domain';

export type ProcessDto = {
  id: string;
  title: string;
  equipment: string;
  currentVersion: number;
  versions: (Omit<ProcessVersion, 'approvedBy'> & { approved: boolean })[];
};
export type Workspace = {
  processes: ProcessDto[];
  findings: Finding[];
  trials: ValidationTrial[];
  changes: ChangeRequest[];
  demo: boolean;
};
export type DraftCapture = {
  id: string;
  processId: string;
  questions: string[];
  answers: { question: string; answer: string }[];
};
export type Extraction = { steps: ProcessStep[]; questions: string[]; notice: string };
export type ScanDetail = {
  id: string;
  processId: string;
  demo: boolean;
  status: 'uploaded' | 'ready' | 'complete';
  recordCount: number;
  readiness?: Readiness;
  funnel?: number[];
};
export type TrialDetail = ValidationTrial & { result?: TrialResult; finding: Finding };
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
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = await getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
      headers.set('Idempotency-Key', crypto.randomUUID());
    }
    const response = await send(`${baseUrl}/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
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
  const get = <T>(path: string) => request<T>(path);
  const post = <T>(path: string, body: unknown = {}) => request<T>(path, body);

  return {
    workspace: () => get<Workspace>('workspace'),

    process: (id: string) => get<ProcessDto>(`processes/${id}`),
    createProcess: (body: { title: string; equipment: string }) =>
      post<ProcessDto>('processes', body),
    createCapture: (
      processId: string,
      body: { kind: 'text'; expertReference: string; text: string },
    ) => post<{ id: string }>(`processes/${processId}/captures`, body),
    analyzeCapture: (processId: string, body: { captureId: string; sample: boolean }) =>
      post<Extraction>(`processes/${processId}/analyze-capture`, body),
    capture: (id: string) => get<DraftCapture>(`captures/${id}`),
    saveDraft: (processId: string, steps: ProcessStep[]) =>
      post<ProcessDto>(`processes/${processId}/draft`, { steps }),
    answerClarification: (
      processId: string,
      body: { captureId: string; stepId: string; question: string; answer: string },
    ) => post<unknown>(`processes/${processId}/clarifications`, body),
    publish: (processId: string, steps: ProcessStep[]) =>
      post<ProcessDto>(`processes/${processId}/publish`, { steps, approved: true }),

    createScan: (body: { processId: string; demo: boolean; rows?: ServiceRecord[] }) =>
      post<{ id: string }>('scans', body),
    scan: (id: string) => get<ScanDetail>(`scans/${id}`),
    checkReadiness: (scanId: string) => post<Readiness>(`scans/${scanId}/readiness`),
    runScan: (scanId: string) => post<{ id: string; funnel: number[] }>(`scans/${scanId}/run`),

    finding: (id: string) => get<Finding>(`findings/${id}`),
    dismissFinding: (id: string) => post<Finding>(`findings/${id}/dismiss`),
    restoreFinding: (id: string) => post<Finding>(`findings/${id}/restore`),
    requestExplanation: (id: string) =>
      post<TechnicianResponse>(`findings/${id}/request-explanation`),

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
