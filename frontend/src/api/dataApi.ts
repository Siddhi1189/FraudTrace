import { apiRequest } from './client';

export interface DataBatch {
  _id: string;
  source: 'CSV_UPLOAD' | 'SIMULATION';
  fileName?: string;
  recordCount: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  createdAt: string;
}

export async function fetchDataBatches(): Promise<{ batches: DataBatch[]; count: number }> {
  return apiRequest<{ batches: DataBatch[]; count: number }>('/api/data/batches');
}

export async function simulateData(size: string = 'small', seed: number = 42): Promise<any> {
  return apiRequest<any>('/api/data/simulate', {
    method: 'POST',
    body: JSON.stringify({ size, seed }),
  });
}
