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

export interface UploadCSVResponse {
  batch: {
    _id: string;
    source: string;
    seed: number | null;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    duplicateRows: number;
    errors: Array<{
      rowNumber?: number;
      externalTransactionId?: string | null;
      errors?: string[];
      reason?: string;
      raw?: string;
    }>;
    createdAt: string;
  };
}

export async function uploadCSV(csvContent: string): Promise<UploadCSVResponse> {
  return apiRequest<UploadCSVResponse>('/api/data/upload', {
    method: 'POST',
    body: JSON.stringify({ csvContent }),
  });
}
