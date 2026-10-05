import { apiRequest } from './client';

export interface AnalysisRunSummary {
  totalAlerts: number;
  totalRings: number;
  highRiskAccounts: number;
  stageMs: {
    graphConstruction?: number;
    detection?: number;
    ringGrouping?: number;
    persistence?: number;
    totalDuration?: number;
  };
  breakdown: {
    circularFlow?: number;
    fanInFanOut?: number;
    sharedDevice?: number;
    passThrough?: number;
    merchantCashOut?: number;
    total?: number;
  };
}

export interface AnalysisRun {
  _id: string;
  trigger: 'MANUAL' | 'SCHEDULED' | 'DATA_INGEST';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  ruleVersion: string;
  parameters?: Record<string, any>;
  summary: AnalysisRunSummary;
  completedAt?: string;
  createdAt: string;
}

export interface DetectorRules {
  ruleVersion: string;
  detectorThresholds: Record<string, any>;
  scoringWeights: {
    account: {
      categoryCaps: Record<string, number>;
      explanation: string;
    };
    ring: {
      categoryCaps: Record<string, number>;
      explanation: string;
    };
  };
  riskThresholds: {
    low: [number, number];
    medium: [number, number];
    high: [number, number];
    critical: [number, number];
  };
}

export async function runAnalysis(trigger: string = 'MANUAL'): Promise<{ run: AnalysisRun; summary: AnalysisRunSummary }> {
  return apiRequest<{ run: AnalysisRun; summary: AnalysisRunSummary }>('/api/analysis/run', {
    method: 'POST',
    body: JSON.stringify({ trigger }),
  });
}

export async function fetchAnalysisRunById(runId: string): Promise<{ run: AnalysisRun }> {
  return apiRequest<{ run: AnalysisRun }>(`/api/analysis/runs/${runId}`);
}

export async function fetchActiveRules(): Promise<DetectorRules> {
  return apiRequest<DetectorRules>('/api/analysis/rules');
}
