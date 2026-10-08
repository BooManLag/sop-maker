export type ID = string;
export interface User { id: ID; organizationId: ID; role: 'expert' | 'reviewer' | 'admin' }
export interface Organization { id: ID; name: string }
export interface ProcessStep { id: ID; sequence: number; action: string; required: boolean; condition?: string; rationale?: string; warning?: string; evidence?: string; durationMinSeconds?: number; durationMaxSeconds?: number; source: 'expert_walkthrough' | 'baseline' | 'validated_field_practice'; evidenceLinks?: ID[] }
export interface ProcessVersion { id: ID; processId: ID; version: number; status: 'draft' | 'published'; title: string; steps: ProcessStep[]; createdAt: string; approvedBy?: ID; findingId?: ID; trialId?: ID }
export interface Process { id: ID; organizationId: ID; title: string; equipment: string; currentVersion: number; versions: ProcessVersion[] }
export interface ExpertCapture { id: ID; processId: ID; expertReference: string; kind: 'text' | 'video' | 'audio' | 'document'; text?: string; fileName?: string }
export interface Clarification { id: ID; captureId: ID; stepId: ID; question: string; answer?: string }
export interface ExpertRationale { id: ID; action: string; condition: string; reason: string; nextAction: string }
export interface Execution { id: ID; technicianId: ID; assetId: ID; equipmentModel: string; jobType: string; timestamp: string; checklistValues: string; partsUsed: string; notes: string; callback: boolean | null }
export interface ExecutionStep { id: ID; executionId: ID; action: string; timestamp?: string }
export interface ExecutionNote { id: ID; executionId: ID; text: string }
export interface Outcome { executionId: ID; callbackWithin30Days: boolean; observationComplete: boolean }
export interface Deviation { id: ID; executionId: ID; stepId: ID; description: string }
export interface CandidatePractice { id: ID; description: string; deviationIds: ID[]; status: 'candidate' | 'investigate' | 'controlled_trial' | 'validated' | 'rejected' | 'human_review' }
export interface EvidenceMetadata { sourceRecordIds: ID[]; sopVersion: number; analysisVersion: string; sampleSize: number; heldOutResult: string; methodology: string; demonstration: boolean }
export interface Finding { id: ID; processId: ID; title: string; grade: 'strong' | 'promising'; description: string; standard: string; practice: string; baselineRate: number; practiceRate: number; technicians: number; evidence: EvidenceMetadata; status: 'candidate' | 'investigate' | 'controlled_trial' | 'validated' | 'dismissed' }
export interface ValidatedPractice { id: ID; findingId: ID; trialId: ID; resultId: ID; approvedForReview: boolean }
export interface TechnicianResponse { id: ID; findingId: ID; reason: string; condition: string; warning: string; equipment: string; doNotUse: string }
export interface ValidationTrial { id: ID; findingId: ID; equipment: string; primaryOutcome: string; testGroup: string; control: string; requiredPerGroup: number; status: 'running' | 'complete'; demo: boolean }
export interface TrialResult { trialId: ID; treatmentRate: number; controlRate: number; treatmentJobs: number; controlJobs: number; outcome: 'validated' | 'did_not_replicate'; demo: boolean }
export interface ChangeRequest { id: ID; processId: ID; findingId: ID; trialId: ID; currentStep: string; proposedStep: string; rationale: string; status: 'draft' | 'submitted' | 'approved'; demo: boolean }
export interface Readiness { eligible: boolean; count: number; categories: { label: string; value: string }[]; can: string[]; cannot: string[]; missing: string[] }
export interface Scan { id: ID; processId: ID; demo: boolean; records: Execution[]; readiness?: Readiness; status: 'uploaded' | 'ready' | 'complete'; findingIds: ID[] }
