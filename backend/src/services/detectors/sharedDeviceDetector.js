import { DEFAULT_DETECTOR_CONFIG } from './detectorConfig.js';

export function runSharedDeviceDetector(graph, customConfig = {}) {
  const config = { ...DEFAULT_DETECTOR_CONFIG.sharedDevice, ...customConfig };
  const detections = [];

  const deviceKeys = Array.from(graph.nodes.keys()).filter((k) => k.startsWith('DEVICE:'));

  for (const devKey of deviceKeys) {
    const devNode = graph.nodes.get(devKey);
    const inEdges = graph.reverseAdjacency.get(devKey) || [];

    // Filter to USED_DEVICE edges from accounts
    const usageEdges = inEdges.filter((e) => e.type === 'USED_DEVICE' && e.sourceKey.startsWith('ACCOUNT:'));

    // Constraint 4: Distinguish unique accounts from transaction edge count
    const uniqueAccountsMap = new Map(); // accountId -> tx[]
    for (const edge of usageEdges) {
      const accId = graph.nodes.get(edge.sourceKey).externalId;
      if (!uniqueAccountsMap.has(accId)) {
        uniqueAccountsMap.set(accId, []);
      }
      uniqueAccountsMap.get(accId).push(edge);
    }

    const uniqueAccountCount = uniqueAccountsMap.size;

    // Apply minimum distinct accounts threshold (>= 3)
    if (uniqueAccountCount >= config.minDistinctAccounts) {
      const accountIds = Array.from(uniqueAccountsMap.keys()).sort();
      const fingerprint = `SHARED_DEVICE:${devNode.externalId}`;

      // Deduplicate evidence transactions
      const seenTx = new Set();
      const evidenceTxs = [];

      for (const edge of usageEdges) {
        if (!seenTx.has(edge.externalTransactionId)) {
          seenTx.add(edge.externalTransactionId);
          evidenceTxs.push({
            externalTransactionId: edge.externalTransactionId,
            fromAccount: graph.nodes.get(edge.sourceKey).externalId,
            toAccount: null,
            merchant: null,
            device: devNode.externalId,
            amount: 0,
            timestamp: edge.timestamp.toISOString(),
          });
        }
      }

      detections.push({
        pattern: 'SHARED_DEVICE',
        fingerprint,
        entities: {
          accounts: accountIds,
          devices: [devNode.externalId],
          merchants: [],
        },
        evidence: {
          summary: `Device ${devNode.externalId} is shared across ${uniqueAccountCount} distinct accounts across ${evidenceTxs.length} separate transactions.`,
          transactions: evidenceTxs,
          metrics: {
            deviceId: devNode.externalId,
            distinctAccountsCount: uniqueAccountCount,
            totalUsageTransactions: evidenceTxs.length,
            accounts: accountIds,
          },
        },
        severity: uniqueAccountCount >= 5 ? 'CRITICAL' : 'HIGH',
        score: Math.min(100, 60 + uniqueAccountCount * 8),
      });
    }
  }

  return detections;
}
