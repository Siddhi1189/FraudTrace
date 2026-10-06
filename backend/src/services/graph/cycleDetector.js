/**
 * Chronological, time-ordered cycle detection for money transfers in FraudTrace.
 * Rules:
 * - Only follows directed TRANSFER edges between Accounts.
 * - Transactions must occur in strictly increasing chronological order: t_1 < t_2 < ... < t_k
 * - Total duration (t_k - t_1) must be within maxWindowMs.
 * - Cycle length between minLength (default 3) and maxLength (default 5).
 */

export function detectTimeOrderedCycles(
  graph,
  {
    minLength = 3,
    maxLength = 5,
    maxWindowMs,
    maxTimeWindowMs,
    maxCycles = 50,
  } = {}
) {
  const windowMs = maxTimeWindowMs || maxWindowMs || (24 * 60 * 60 * 1000);
  const accountKeys = Array.from(graph.nodes.keys()).filter((k) => k.startsWith('ACCOUNT:'));
  const foundCycles = [];
  const seenCycleFingerprints = new Set();

  for (const startKey of accountKeys) {
    if (foundCycles.length >= maxCycles) break;

    // DFS with chronological tracking
    // State: currentKey, visitedKeys (Set), pathEdges (Array)
    function dfsCycle(currentKey, pathEdges, visitedKeys) {
      if (foundCycles.length >= maxCycles) return;
      if (pathEdges.length >= maxLength) return;

      const outgoing = graph.adjacency.get(currentKey) || [];
      const transferEdges = outgoing.filter((e) => e.type === 'TRANSFER' && e.targetKey.startsWith('ACCOUNT:'));

      for (const edge of transferEdges) {
        // Chronological check: edge.timestamp must be >= previous edge timestamp
        if (pathEdges.length > 0) {
          const prevEdge = pathEdges[pathEdges.length - 1];
          if (edge.timestamp.getTime() <= prevEdge.timestamp.getTime()) {
            continue; // Not chronological forward progression
          }

          const firstEdge = pathEdges[0];
          const elapsedMs = edge.timestamp.getTime() - firstEdge.timestamp.getTime();
          if (elapsedMs > windowMs) {
            continue; // Exceeds time window
          }
        }

        // Check if cycle is closed back to startKey
        if (edge.targetKey === startKey) {
          const cycleEdges = [...pathEdges, edge];
          if (cycleEdges.length >= minLength) {
            const accountsInCycle = cycleEdges.map((e) => graph.nodes.get(e.sourceKey).externalId);

            // Canonical fingerprint to deduplicate rotated versions of the same cycle
            const sortedAccounts = [...accountsInCycle].sort();
            const fingerprint = sortedAccounts.join('->');

            if (!seenCycleFingerprints.has(fingerprint)) {
              seenCycleFingerprints.add(fingerprint);

              const firstTime = cycleEdges[0].timestamp.getTime();
              const lastTime = cycleEdges[cycleEdges.length - 1].timestamp.getTime();
              const durationMinutes = Math.round((lastTime - firstTime) / (60 * 1000));
              const totalAmount = cycleEdges.reduce((sum, e) => sum + (e.amount || 0), 0);

              foundCycles.push({
                cycleAccounts: accountsInCycle,
                transactions: cycleEdges.map((e) => ({
                  externalTransactionId: e.externalTransactionId,
                  fromAccount: graph.nodes.get(e.sourceKey).externalId,
                  toAccount: graph.nodes.get(e.targetKey).externalId,
                  amount: e.amount,
                  timestamp: e.timestamp.toISOString(),
                })),
                cycleLength: cycleEdges.length,
                durationMinutes,
                totalAmount,
                startTime: cycleEdges[0].timestamp.toISOString(),
                endTime: cycleEdges[cycleEdges.length - 1].timestamp.toISOString(),
              });
            }
          }
        } else if (!visitedKeys.has(edge.targetKey)) {
          // Continue exploring unvisited nodes
          visitedKeys.add(edge.targetKey);
          dfsCycle(edge.targetKey, [...pathEdges, edge], visitedKeys);
          visitedKeys.delete(edge.targetKey);
        }
      }
    }

    const visited = new Set([startKey]);
    dfsCycle(startKey, [], visited);
  }

  return foundCycles;
}
