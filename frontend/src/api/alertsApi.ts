import { apiRequest } from './client';

export interface AlertEvidence {
  transactions?: Array<{
    externalTransactionId: string;
    fromAccount?: string;
    toAccount?: string;
    merchant?: string;
    device?: string;
    amount: number;
    timestamp: string;
    [key: string]: any;
  }>;
  cycleAccounts?: string[];
  accounts?: string[];
  devices?: string[];
  merchants?: string[];
  summary?: string;
  [key: string]: any;
}

export interface Alert {
  _id: string;
  analysisRunId: string;
  fingerprint: string;
  pattern: 'CIRCULAR_FLOW' | 'FAN_IN_FAN_OUT' | 'SHARED_DEVICE' | 'PASS_THROUGH' | 'MERCHANT_CASHOUT' | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  triageStatus: 'NEW' | 'REVIEWING' | 'DISMISSED' | 'ESCALATED';
  evidence: AlertEvidence;
  ringId?: {
    _id: string;
    label: string;
    score: number;
    patterns: string[];
    totalFlow?: number;
    transactionCount?: number;
  } | string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertItem = Alert;

export interface AlertFilterParams {
  severity?: string;
  pattern?: string;
  triageStatus?: string;
  ringId?: string;
  analysisRunId?: string;
}

export async function fetchAlerts(params: AlertFilterParams = {}): Promise<{ alerts: Alert[]; count: number }> {
  const query = new URLSearchParams();
  if (params.severity) query.set('severity', params.severity);
  if (params.pattern) query.set('pattern', params.pattern);
  if (params.triageStatus) query.set('triageStatus', params.triageStatus);
  if (params.ringId) query.set('ringId', params.ringId);
  if (params.analysisRunId) query.set('analysisRunId', params.analysisRunId);

  const qs = query.toString();
  return apiRequest<{ alerts: Alert[]; count: number }>(`/api/alerts${qs ? `?${qs}` : ''}`);
}

export async function fetchAlertById(alertId: string): Promise<{ alert: Alert }> {
  return apiRequest<{ alert: Alert }>(`/api/alerts/${alertId}`);
}

export async function updateAlertTriage(alertId: string, triageStatus: string): Promise<{ alert: Alert }> {
  return apiRequest<{ alert: Alert }>(`/api/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify({ triageStatus }),
  });
}
