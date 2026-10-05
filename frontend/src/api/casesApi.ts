import { apiRequest } from './client';
import { AlertItem } from './alertsApi';
import { AIBriefItem } from './aiApi';

export type CaseStatus = 'OPEN' | 'INVESTIGATING' | 'CLOSED';
export type CaseDisposition = 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'INCONCLUSIVE';

export interface CaseUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface CaseItem {
  _id: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  disposition: CaseDisposition | null;
  createdBy: CaseUser;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  alertCount?: number;
}

export interface CaseNoteItem {
  _id: string;
  caseId: string;
  authorId: CaseUser;
  content: string;
  createdAt: string;
}

export interface CaseEventItem {
  _id: string;
  caseId: string;
  eventType: string;
  metadata: Record<string, any>;
  createdBy?: CaseUser;
  createdAt: string;
}

export interface AttachedAlertItem extends AlertItem {
  attachedAt?: string;
}

export interface CaseDetailResponse {
  case: CaseItem;
  alerts: AttachedAlertItem[];
  notes: CaseNoteItem[];
  events: CaseEventItem[];
  briefs?: AIBriefItem[];
}

export async function fetchCases(params?: { status?: string; disposition?: string }): Promise<{ cases: CaseItem[]; count: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.disposition) query.set('disposition', params.disposition);

  const qs = query.toString();
  return apiRequest<{ cases: CaseItem[]; count: number }>(`/api/cases${qs ? `?${qs}` : ''}`);
}

export async function fetchCaseById(id: string): Promise<CaseDetailResponse> {
  return apiRequest<CaseDetailResponse>(`/api/cases/${id}`);
}

export async function createCase(payload: { title: string; initialAlertId?: string }): Promise<{ case: CaseItem }> {
  return apiRequest<{ case: CaseItem }>('/api/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCase(
  id: string,
  payload: { title?: string; status?: CaseStatus; disposition?: CaseDisposition | null }
): Promise<{ case: CaseItem }> {
  return apiRequest<{ case: CaseItem }>(`/api/cases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addCaseNote(id: string, content: string): Promise<{ note: CaseNoteItem }> {
  return apiRequest<{ note: CaseNoteItem }>(`/api/cases/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function attachAlertToCase(id: string, alertId: string): Promise<{ caseAlert: any }> {
  return apiRequest<{ caseAlert: any }>(`/api/cases/${id}/alerts`, {
    method: 'POST',
    body: JSON.stringify({ alertId }),
  });
}

export async function fetchCaseEvents(id: string): Promise<{ events: CaseEventItem[] }> {
  return apiRequest<{ events: CaseEventItem[] }>(`/api/cases/${id}/events`);
}
