import { apiRequest } from './client';

export interface GraphNodeData {
  id: string;
  key: string;
  mongoId: string;
  externalId: string;
  entityType: 'ACCOUNT' | 'DEVICE' | 'MERCHANT';
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: 'TRANSFER' | 'PAYMENT' | 'USED_DEVICE';
  amount?: number | null;
  timestamp?: string | null;
  externalTransactionId?: string | null;
  [key: string]: any;
}

export interface GraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  truncated?: boolean;
}

export interface NeighborhoodParams {
  entityId: string;
  entityType?: 'ACCOUNT' | 'DEVICE' | 'MERCHANT';
  depth?: number;
  limit?: number;
}

export interface PathParams {
  sourceId: string;
  targetId: string;
  maxDepth?: number;
  directed?: boolean;
}

export async function fetchNeighborhood(params: NeighborhoodParams): Promise<GraphResponse> {
  const query = new URLSearchParams();
  query.set('entityId', params.entityId);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.depth) query.set('depth', String(params.depth));
  if (params.limit) query.set('limit', String(params.limit));

  return apiRequest<GraphResponse>(`/api/graph/neighborhood?${query.toString()}`);
}

export async function fetchPath(params: PathParams): Promise<{ path: Array<{ from: string; to: string; type: string }>; found: boolean }> {
  const query = new URLSearchParams();
  query.set('sourceId', params.sourceId);
  query.set('targetId', params.targetId);
  if (params.maxDepth) query.set('maxDepth', String(params.maxDepth));
  if (params.directed !== undefined) query.set('directed', String(params.directed));

  return apiRequest<{ path: Array<{ from: string; to: string; type: string }>; found: boolean }>(`/api/graph/path?${query.toString()}`);
}
