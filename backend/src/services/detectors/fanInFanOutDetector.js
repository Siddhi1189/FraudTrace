import { DEFAULT_DETECTOR_CONFIG } from './detectorConfig.js';

export function runFanInFanOutDetector(graph, customConfig = {}) {
  const config = { ...DEFAULT_DETECTOR_CONFIG.fanInFanOut, ...customConfig };
  const detections = [];

  const accountKeys = Array.from(graph.nodes.keys()).filter((k) => k.startsWith('ACCOUNT:'));

  for (const hubKey of accountKeys) {
    const hubNode = graph.nodes.get(hubKey);
    const inEdges = (graph.reverseAdjacency.get(hubKey) || []).filter(
      (e) => e.type === 'TRANSFER' && e.sourceKey.startsWith('ACCOUNT:')
    );
    const outEdges = (graph.adjacency.get(hubKey) || []).filter(
      (e) => e.type === 'TRANSFER' && e.targetKey.startsWith('ACCOUNT:')
    );

    if (inEdges.length === 0 || outEdges.length === 0) continue;

    // Sort all transactions by timestamp to test sliding time windows
    const allEdges = [...inEdges.map((e) => ({ ...e, dir: 'IN' })), ...outEdges.map((e) => ({ ...e, dir: 'OUT' }))];
    allEdges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Window evaluation
    let windowStart = 0;
    const distinctSenders = new Map(); // accountId -> tx[]
    const distinctReceivers = new Map(); // accountId -> tx[]

    for (let windowEnd = 0; windowEnd < allEdges.length; windowEnd++) {
      const edgeEnd = allEdges[windowEnd];
      const maxWindowMs = config.maxTimeWindowMs;

      // Add to window
      if (edgeEnd.dir === 'IN') {
        const senderId = graph.nodes.get(edgeEnd.sourceKey).externalId;
        if (!distinctSenders.has(senderId)) distinctSenders.set(senderId, []);
        distinctSenders.get(senderId).push(edgeEnd);
      } else {
        const receiverId = graph.nodes.get(edgeEnd.targetKey).externalId;
        if (!distinctReceivers.has(receiverId)) distinctReceivers.set(receiverId, []);
        distinctReceivers.get(receiverId).push(edgeEnd);
      }

      // Shrink window from start if outside maxWindowMs
      while (edgeEnd.timestamp.getTime() - allEdges[windowStart].timestamp.getTime() > maxWindowMs) {
        const edgeStart = allEdges[windowStart];
        if (edgeStart.dir === 'IN') {
          const sId = graph.nodes.get(edgeStart.sourceKey).externalId;
          const list = distinctSenders.get(sId);
          if (list) {
            const idx = list.findIndex((e) => e.id === edgeStart.id);
            if (idx >= 0) list.splice(idx, 1);
            if (list.length === 0) distinctSenders.delete(sId);
          }
        } else {
          const rId = graph.nodes.get(edgeStart.targetKey).externalId;
          const list = distinctReceivers.get(rId);
          if (list) {
            const idx = list.findIndex((e) => e.id === edgeStart.id);
            if (idx >= 0) list.splice(idx, 1);
            if (list.length === 0) distinctReceivers.delete(rId);
          }
        }
        windowStart++;
      }

      // Check if thresholds met
      if (
        distinctSenders.size >= config.minDistinctSenders &&
        distinctReceivers.size >= config.minDistinctReceivers
      ) {
        const sendersList = Array.from(distinctSenders.keys()).sort();
        const receiversList = Array.from(distinctReceivers.keys()).sort();
        const fingerprint = `FAN_IN_FAN_OUT:${hubNode.externalId}`;

        // Collect distinct evidence transactions
        const seenTx = new Set();
        const evidenceTxs = [];
        let totalInAmount = 0;
        let totalOutAmount = 0;

        for (let i = windowStart; i <= windowEnd; i++) {
          const e = allEdges[i];
          if (!seenTx.has(e.externalTransactionId)) {
            seenTx.add(e.externalTransactionId);
            evidenceTxs.push({
              externalTransactionId: e.externalTransactionId,
              fromAccount: graph.nodes.get(e.sourceKey).externalId,
              toAccount: graph.nodes.get(e.targetKey).externalId,
              merchant: null,
              device: null,
              amount: e.amount,
              timestamp: e.timestamp.toISOString(),
            });
            if (e.dir === 'IN') totalInAmount += e.amount || 0;
            else totalOutAmount += e.amount || 0;
          }
        }

        detections.push({
          pattern: 'FAN_IN_FAN_OUT',
          fingerprint,
          entities: {
            accounts: [hubNode.externalId, ...sendersList, ...receiversList],
            devices: [],
            merchants: [],
          },
          evidence: {
            summary: `Hub account ${hubNode.externalId} aggregated funds from ${distinctSenders.size} distinct senders and dispersed to ${distinctReceivers.size} distinct receivers within the active time window.`,
            transactions: evidenceTxs,
            metrics: {
              hubAccount: hubNode.externalId,
              distinctSendersCount: distinctSenders.size,
              distinctReceiversCount: distinctReceivers.size,
              totalInboundAmount: Math.round(totalInAmount * 100) / 100,
              totalOutboundAmount: Math.round(totalOutAmount * 100) / 100,
              windowStart: allEdges[windowStart].timestamp.toISOString(),
              windowEnd: edgeEnd.timestamp.toISOString(),
            },
          },
          severity: 'HIGH',
          score: 80,
        });

        // Found detection for this hub in this window, move to next hub
        break;
      }
    }
  }

  return detections;
}
