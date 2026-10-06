import { Alert } from '../models/alert.model.js';
import { emitSocketEvent } from '../socket/index.js';

export async function getAlerts(filters = {}) {
  const query = {};

  if (filters.severity) query.severity = filters.severity;
  if (filters.pattern) query.pattern = filters.pattern;
  if (filters.triageStatus) query.triageStatus = filters.triageStatus;
  if (filters.ringId) query.ringId = filters.ringId;
  if (filters.analysisRunId) query.analysisRunId = filters.analysisRunId;

  // Section 12.3: Risk score filter on alerts
  if (filters.score !== undefined && filters.score !== '') {
    query.score = Number(filters.score);
  } else {
    const scoreConditions = {};
    if (filters.minScore !== undefined && filters.minScore !== '') {
      scoreConditions.$gte = Number(filters.minScore);
    }
    if (filters.maxScore !== undefined && filters.maxScore !== '') {
      scoreConditions.$lte = Number(filters.maxScore);
    }
    if (Object.keys(scoreConditions).length > 0) {
      query.score = scoreConditions;
    }
  }

  return Alert.find(query)
    .populate('ringId', 'label score patterns')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAlertById(alertId) {
  const alert = await Alert.findById(alertId)
    .populate('ringId', 'label score patterns totalFlow transactionCount')
    .lean();

  if (!alert) {
    const error = new Error('Alert not found');
    error.statusCode = 404;
    throw error;
  }
  return alert;
}

export async function updateAlertTriage(alertId, triageStatus) {
  const validStatuses = ['NEW', 'REVIEWING', 'DISMISSED', 'ESCALATED'];
  if (!validStatuses.includes(triageStatus)) {
    const error = new Error(`Invalid triage status "${triageStatus}". Allowed values: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { triageStatus },
    { new: true, runValidators: true }
  ).populate('ringId', 'label score patterns');

  if (!alert) {
    const error = new Error('Alert not found');
    error.statusCode = 404;
    throw error;
  }

  emitSocketEvent('alert-updated', { alert });
  return alert;
}
