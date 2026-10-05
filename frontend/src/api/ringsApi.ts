import { apiRequest } from './client';
import { Alert } from './alertsApi';

export interface FraudRingContributor {
  signalName: string;
  category: string;
  weight: number;
  score: number;
  evidence: string;
  ruleVersion?: string;
}

export interface FraudRingMember {
  _id: string;
  ringId: string;
  entityType: 'ACCOUNT' | 'DEVICE' | 'MERCHANT';
  entityId: {
    _id: string;
    externalId?: string;
    externalAccountId?: string;
    externalDeviceId?: string;
    externalMerchantId?: string;
    accountNumber?: string;
    customerName?: string;
    deviceType?: string;
    name?: string;
    [key: string]: any;
  } | string;
}

export interface FraudRing {
  _id: string;
  analysisRunId: string;
  fingerprint: string;
  label: string;
  status: 'ACTIVE' | 'DISSOLVED';
  score: number;
  contributors: FraudRingContributor[];
  totalFlow: number;
  transactionCount: number;
  patterns: string[];
  memberCount?: number;
  firstDetectedAt?: string;
  lastDetectedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FraudRingDetail extends FraudRing {
  members: FraudRingMember[];
  alerts: Alert[];
  alertCount: number;
}

export async function fetchRings(status?: string): Promise<{ rings: FraudRing[]; count: number }> {
  const query = status ? `?status=${status}` : '';
  return apiRequest<{ rings: FraudRing[]; count: number }>(`/api/rings${query}`);
}

export async function fetchRingById(ringId: string): Promise<{ ring: FraudRingDetail }> {
  return apiRequest<{ ring: FraudRingDetail }>(`/api/rings/${ringId}`);
}
