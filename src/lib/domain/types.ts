export type ID = string;
export interface User {
  id: ID;
  organizationId: ID;
  role: 'viewer' | 'expert' | 'reviewer' | 'admin';
}
export interface Organization {
  id: ID;
  name: string;
}
export interface ProcessStep {
  id: ID;
  sequence: number;
  action: string;
  required: boolean;
  condition?: string;
  rationale?: string;
  warning?: string;
  evidence?: string;
  durationMinSeconds?: number;
  durationMaxSeconds?: number;
  source: 'expert_walkthrough' | 'baseline' | 'validated_field_practice';
  evidenceLinks?: ID[];
  /** Suggested video frame for this step, in milliseconds from the recording start. */
  frameAtMs?: number;
  frameObjectPath?: string;
}
export interface ProcessVersion {
  id: ID;
  processId: ID;
  version: number;
  status: 'draft' | 'published';
  title: string;
  steps: ProcessStep[];
  createdAt: string;
  approvedBy?: ID;
  findingId?: ID;
  trialId?: ID;
}
export interface Process {
  id: ID;
  organizationId: ID;
  title: string;
  equipment: string;
  currentVersion: number;
  versions: ProcessVersion[];
}
export interface ExpertCapture {
  id: ID;
  processId: ID;
  expertReference: string;
  kind: 'text' | 'video' | 'audio' | 'document';
  text?: string;
  fileName?: string;
  questions?: string[];
  media?: {
    objectPath: string;
    /** Set once the recording has passed inspection and left quarantine. */
    cleanPath?: string;
    /** SHA-256 of the recording, so identical uploads reuse one transcription. */
    sha256?: string;
    contentType: MediaContentType;
    /** Length read from the file by the media worker; absent until inspection. */
    seconds?: number;
  };
  /** Who confirmed that everyone in the recording agreed to be recorded. */
  consent?: { confirmedBy: string; confirmedAt: string };
  status?: 'awaiting_upload' | 'transcribed' | 'rejected' | 'failed';
  /** Why a recording was rejected, in words safe to show the expert. */
  rejection?: string;
  segments?: TranscriptSegment[];
  /** Steps as the model suggested them, kept apart from the expert's later edits. */
  suggestedSteps?: SuggestedStep[];
  createdAt?: string;
  expiresAt?: string;
}
export const mediaContentTypes = ['audio/webm', 'audio/mp4', 'video/webm', 'video/mp4'] as const;
/** Largest recording upload, shared by the upload form and the signed URL's size range. */
export const maxMediaBytes = 100_000_000;
/** Largest stored step image. */
export const maxFrameBytes = 500_000;
/** Short-lived read links to step images, keyed by step id. */
export type StepImageLinks = Record<string, string>;
export const isVideo = (contentType: MediaContentType) => contentType.startsWith('video/');
export type MediaContentType = (typeof mediaContentTypes)[number];
export interface SuggestedStep {
  action: string;
  frameAtMs: number;
}
export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}
export interface Clarification {
  id: ID;
  captureId: ID;
  stepId: ID;
  question: string;
  answer?: string;
}
export interface ExpertRationale {
  id: ID;
  action: string;
  condition: string;
  reason: string;
  nextAction: string;
}
export interface Execution {
  id: ID;
  technicianId: ID;
  assetId: ID;
  equipmentModel: string;
  jobType: string;
  timestamp: string;
  checklistValues: string;
  partsUsed: string;
  notes: string;
  callback: boolean | null;
}
export interface ExecutionStep {
  id: ID;
  executionId: ID;
  action: string;
  timestamp?: string;
}
export interface ExecutionNote {
  id: ID;
  executionId: ID;
  text: string;
}
export interface Outcome {
  executionId: ID;
  callbackWithin30Days: boolean;
  observationComplete: boolean;
}
export interface Deviation {
  id: ID;
  executionId: ID;
  stepId: ID;
  description: string;
}
export interface CandidatePractice {
  id: ID;
  description: string;
  deviationIds: ID[];
  status:
    'candidate' | 'investigate' | 'controlled_trial' | 'validated' | 'rejected' | 'human_review';
}
export interface EvidenceMetadata {
  sourceRecordIds: ID[];
  sopVersion: number;
  analysisVersion: string;
  sampleSize: number;
  heldOutResult: string;
  methodology: string;
  demonstration: boolean;
}
export interface Finding {
  id: ID;
  processId: ID;
  title: string;
  grade: 'strong' | 'promising';
  description: string;
  standard: string;
  practice: string;
  baselineRate: number;
  practiceRate: number;
  technicians: number;
  evidence: EvidenceMetadata;
  status: 'candidate' | 'investigate' | 'controlled_trial' | 'validated' | 'dismissed';
}
export interface ValidatedPractice {
  id: ID;
  findingId: ID;
  trialId: ID;
  resultId: ID;
  approvedForReview: boolean;
}
export interface TechnicianResponse {
  id: ID;
  findingId: ID;
  reason: string;
  condition: string;
  warning: string;
  equipment: string;
  doNotUse: string;
}
/** The outcome every trial in this product compares; findings are scored on the same measure. */
export const trialPrimaryOutcome = '30-day callback rate';
export interface ValidationTrial {
  id: ID;
  findingId: ID;
  equipment: string;
  primaryOutcome: string;
  testGroup: string;
  control: string;
  requiredPerGroup: number;
  status: 'running' | 'complete';
  demo: boolean;
}
export interface TrialResult {
  trialId: ID;
  treatmentRate: number;
  controlRate: number;
  treatmentJobs: number;
  controlJobs: number;
  outcome: 'validated' | 'did_not_replicate';
  demo: boolean;
}
export interface ChangeRequest {
  id: ID;
  processId: ID;
  findingId: ID;
  trialId: ID;
  currentStep: string;
  proposedStep: string;
  rationale: string;
  status: 'draft' | 'submitted' | 'approved';
  demo: boolean;
}
export interface Readiness {
  eligible: boolean;
  count: number;
  categories: { label: string; value: string }[];
  can: string[];
  cannot: string[];
  missing: string[];
}
export interface Scan {
  id: ID;
  processId: ID;
  demo: boolean;
  records: Execution[];
  readiness?: Readiness;
  status: 'uploaded' | 'ready' | 'analyzing' | 'failed' | 'complete';
  findingIds: ID[];
  /** Live scans only: jobs reviewed through to practices that held on later jobs. */
  funnel?: number[];
  createdAt?: string;
  expiresAt?: string;
}
