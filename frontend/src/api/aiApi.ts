import { apiRequest } from './client';

export type AiBriefKind = 'INVESTIGATION_BRIEF' | 'CASE_QA';
export type VerificationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'FALLBACK';
export type AnalystDecision = 'PENDING' | 'ACCEPTED' | 'EDITED' | 'DISCARDED';

export interface StructuredFinding {
  id: string;
  claim: string;
  evidenceIds: string[];
  category: 'FACTUAL_EVIDENCE' | 'SUSPICIOUS_INDICATOR' | 'INTERPRETATION';
}

export interface EntityRole {
  entityId: string;
  role: string;
  supportingEvidenceIds: string[];
}

export interface StructuredBriefOutput {
  executiveSummary: string;
  findings: StructuredFinding[];
  suspiciousIndicators: string[];
  entityRoles: EntityRole[];
  timelineAnalysis: string;
  limitations: string[];
  recommendations: string[];
}

export interface StructuredQaOutput {
  answer: string;
  evidenceIds: string[];
  confidence: 'GROUNDED' | 'INSUFFICIENT_EVIDENCE';
  unsupportedReason?: string | null;
}

export interface AIBriefItem {
  _id: string;
  caseId: string;
  kind: AiBriefKind;
  question: string | null;
  evidenceSnapshot: any;
  evidenceHash: string;
  structuredOutput: StructuredBriefOutput & StructuredQaOutput;
  verificationStatus: VerificationStatus;
  verificationErrors: string[];
  model: string;
  promptVersion: string;
  analystDecision: AnalystDecision;
  editedText: string | null;
  createdAt: string;
}

export async function createAiBrief(caseId: string): Promise<AIBriefItem> {
  return apiRequest<AIBriefItem>('/ai/briefs', {
    method: 'POST',
    body: JSON.stringify({ caseId }),
  });
}

export async function fetchAiBrief(id: string): Promise<AIBriefItem> {
  return apiRequest<AIBriefItem>(`/ai/briefs/${id}`);
}

export async function updateAiBrief(
  id: string,
  updates: { analystDecision?: AnalystDecision; editedText?: string | null }
): Promise<AIBriefItem> {
  return apiRequest<AIBriefItem>(`/ai/briefs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function askCaseQuestion(caseId: string, question: string): Promise<AIBriefItem> {
  return apiRequest<AIBriefItem>(`/ai/cases/${caseId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}
