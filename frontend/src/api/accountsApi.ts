import { apiRequest } from './client';
import { Alert } from './alertsApi';

export interface AccountRiskContributor {
  signalName: string;
  category: string;
  signalValue: string;
  maxCap?: number;
  weight?: number;
  score: number;
  pointsAwarded?: number;
  evidence: string;
  ruleVersion?: string;
}

export interface AccountRisk {
  _id: string;
  accountId: string;
  analysisRunId: string;
  score: number;
  contributors: AccountRiskContributor[];
  whyFlagged: string[];
  ruleVersion: string;
  createdAt: string;
}

export interface AccountDetails {
  _id: string;
  externalId: string;
  accountNumber?: string;
  customerName?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface AccountProfileResponse {
  account: AccountDetails;
  latestRisk: AccountRisk | null;
  recentAlerts: Alert[];
  ringMemberships: Array<{
    _id: string;
    ringId: {
      _id: string;
      label: string;
      score: number;
      patterns: string[];
      status: string;
    };
    entityType: string;
  }>;
}

export interface AccountTransaction {
  _id: string;
  externalTransactionId: string;
  fromAccount?: { _id: string; externalId: string };
  toAccount?: { _id: string; externalId: string };
  merchant?: { _id: string; externalId: string; name?: string };
  device?: { _id: string; externalId: string };
  amount: number;
  type: string;
  timestamp: string;
}

export interface AccountTransactionsResponse {
  transactions: AccountTransaction[];
  count: number;
  total?: number;
}

export async function fetchAccountProfile(accountId: string): Promise<AccountProfileResponse> {
  return apiRequest<AccountProfileResponse>(`/api/accounts/${accountId}`);
}

export async function fetchAccountTransactions(
  accountId: string,
  limit: number = 50
): Promise<AccountTransactionsResponse> {
  return apiRequest<AccountTransactionsResponse>(`/api/accounts/${accountId}/transactions?limit=${limit}`);
}
