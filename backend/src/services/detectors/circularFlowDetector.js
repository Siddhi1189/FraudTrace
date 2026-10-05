import { detectTimeOrderedCycles } from '../graph/cycleDetector.js';

export function runCircularFlowDetector(graph, config = {}) {
  const cycles = detectTimeOrderedCycles(graph, config);
  const detections = [];

  for (const cycle of cycles) {
    const sortedAccounts = [...cycle.cycleAccounts].sort();
    const fingerprint = `CIRCULAR_FLOW:${sortedAccounts.join(':')}`;

    detections.push({
      pattern: 'CIRCULAR_FLOW',
      fingerprint,
      entities: {
        accounts: cycle.cycleAccounts,
        devices: [],
        merchants: [],
      },
      evidence: {
        summary: `Detected chronological circular fund flow of ${cycle.cycleLength} accounts returning funds within ${cycle.durationMinutes} minutes.`,
        transactions: cycle.transactions,
        metrics: {
          cycleLength: cycle.cycleLength,
          durationMinutes: cycle.durationMinutes,
          totalAmount: cycle.totalAmount,
          startTime: cycle.startTime,
          endTime: cycle.endTime,
        },
      },
      severity: 'HIGH',
      score: 85,
    });
  }

  return detections;
}
