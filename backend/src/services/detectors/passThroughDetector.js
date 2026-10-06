import { DEFAULT_DETECTOR_CONFIG } from './detectorConfig.js';

export function runPassThroughDetector(graph, customConfig = {}) {
  const config = { ...DEFAULT_DETECTOR_CONFIG.passThrough, ...customConfig };
  const detections = [];

  const accountKeys = Array.from(graph.nodes.keys()).filter((k) => k.startsWith('ACCOUNT:'));

  for (const accKey of accountKeys) {
    const accNode = graph.nodes.get(accKey);

    const inTransfers = (graph.reverseAdjacency.get(accKey) || [])
      .filter((e) => e.type === 'TRANSFER' && e.sourceKey.startsWith('ACCOUNT:'))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const outTransfers = (graph.adjacency.get(accKey) || [])
      .filter((e) => (e.type === 'TRANSFER' && e.targetKey.startsWith('ACCOUNT:')) || (e.type === 'PAYMENT' && e.targetKey.startsWith('MERCHANT:')))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (inTransfers.length === 0 || outTransfers.length === 0) continue;

    const matchedPairs = [];
    const usedOutEdgeIds = new Set();
    const maxDelayMs = config.maxDelayMinutes * 60 * 1000;

    for (const inTx of inTransfers) {
      for (const outTx of outTransfers) {
        if (usedOutEdgeIds.has(outTx.id)) continue;

        const delayMs = outTx.timestamp.getTime() - inTx.timestamp.getTime();
        if (delayMs >= 0 && delayMs <= maxDelayMs) {
          const ratio = (outTx.amount || 0) / (inTx.amount || 1);
          if (ratio >= config.minForwardingRatio && ratio <= 1.25) {
            usedOutEdgeIds.add(outTx.id);
            matchedPairs.push({
              inbound: inTx,
              outbound: outTx,
              delayMinutes: Math.round(delayMs / (60 * 1000)),
              forwardingRatio: Math.round(ratio * 100) / 100,
            });
            break; // Matched this inbound transaction
          }
        }
      }
    }

    if (matchedPairs.length >= config.minOccurrences) {
      const fingerprint = `PASS_THROUGH:${accNode.externalId}`;
      const evidenceTxs = [];
      let totalForwarded = 0;
      let totalReceived = 0;

      for (const pair of matchedPairs) {
        totalReceived += pair.inbound.amount || 0;
        totalForwarded += pair.outbound.amount || 0;

        evidenceTxs.push({
          externalTransactionId: pair.inbound.externalTransactionId,
          fromAccount: graph.nodes.get(pair.inbound.sourceKey).externalId,
          toAccount: accNode.externalId,
          merchant: null,
          device: null,
          amount: pair.inbound.amount,
          timestamp: pair.inbound.timestamp.toISOString(),
          type: 'INBOUND',
        });

        evidenceTxs.push({
          externalTransactionId: pair.outbound.externalTransactionId,
          fromAccount: accNode.externalId,
          toAccount: pair.outbound.targetKey.startsWith('ACCOUNT:')
            ? graph.nodes.get(pair.outbound.targetKey).externalId
            : null,
          merchant: pair.outbound.targetKey.startsWith('MERCHANT:')
            ? graph.nodes.get(pair.outbound.targetKey).externalId
            : null,
          device: null,
          amount: pair.outbound.amount,
          timestamp: pair.outbound.timestamp.toISOString(),
          type: 'OUTBOUND',
        });
      }

      const overallRatio = totalReceived > 0 ? Math.round((totalForwarded / totalReceived) * 100) / 100 : 0;
      const avgDelay = Math.round(
        matchedPairs.reduce((sum, p) => sum + p.delayMinutes, 0) / matchedPairs.length
      );

      detections.push({
        pattern: 'PASS_THROUGH',
        fingerprint,
        entities: {
          accounts: [accNode.externalId],
          devices: [],
          merchants: [],
        },
        evidence: {
          summary: `Account ${accNode.externalId} repeatedly forwarded ${Math.round(overallRatio * 100)}% of incoming funds within an average delay of ${avgDelay} minutes across ${matchedPairs.length} instances.`,
          transactions: evidenceTxs,
          metrics: {
            account: accNode.externalId,
            occurrences: matchedPairs.length,
            averageDelayMinutes: avgDelay,
            overallForwardingRatio: overallRatio,
            totalReceived,
            totalForwarded,
          },
        },
        severity: 'HIGH',
        score: 75,
      });
    }
  }

  return detections;
}
