import { io, Socket } from 'socket.io-client';
import { getStoredToken, removeStoredToken } from '../api/client';
import { queryClient } from './queryClient';

let socketInstance: Socket | null = null;

export interface AnalysisProgressPayload {
  runId: string;
  stage?: 'GRAPH_CONSTRUCTION' | 'FRAUD_DETECTION' | 'RING_GROUPING' | string;
  progress?: number;
  nodeCount?: number;
  edgeCount?: number;
  detectionCount?: number;
  breakdown?: Record<string, number>;
  ringCount?: number;
}

export interface AnalysisCompletedPayload {
  runId: string;
  summary?: {
    totalEntities?: number;
    totalTransactions?: number;
    totalRings?: number;
    totalAlerts?: number;
    durationMs?: number;
  };
  timestamp?: string;
}

export interface AlertEventPayload {
  alert: unknown;
}

export interface AlertCreatedPayload {
  alert: any;
}

export interface CaseEventPayload {
  caseId: string;
  status?: string;
  disposition?: string;
}

export interface AiCompletedPayload {
  caseId: string;
  briefId: string;
  kind: string;
}

/**
 * Returns the current socket instance or initializes a new connection
 * if a valid token exists in storage.
 */
export function getSocket(): Socket | null {
  const token = getStoredToken();
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    return socketInstance;
  }

  // Connect to backend URL or relative origin proxied by Vite
  const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const socketUrl = rawSocketUrl ? rawSocketUrl.replace(/\/+$/, '') : undefined;

  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socketInstance.on('connect_error', (err) => {
    // If the error is authentication failure, trigger expired-session flow
    const msg = err.message || '';
    if (
      msg.includes('Authentication token required') ||
      msg.includes('Invalid or expired') ||
      msg.includes('jwt')
    ) {
      disconnectSocket();
      removeStoredToken();
      queryClient.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
  });

  // Data refresh events: TanStack Query cache invalidations
  socketInstance.on('alert-created', () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  socketInstance.on('alert-updated', () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  socketInstance.on('case-updated', (payload: CaseEventPayload) => {
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    if (payload?.caseId) {
      queryClient.invalidateQueries({ queryKey: ['case', payload.caseId] });
    }
  });

  socketInstance.on('ai-completed', (payload: AiCompletedPayload) => {
    if (payload?.caseId) {
      queryClient.invalidateQueries({ queryKey: ['case', payload.caseId] });
      queryClient.invalidateQueries({ queryKey: ['briefs', payload.caseId] });
    }
  });

  return socketInstance;
}

/**
 * Gracefully disconnects and resets the Socket.IO client.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
