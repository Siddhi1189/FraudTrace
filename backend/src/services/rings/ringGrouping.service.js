import crypto from 'crypto';

/**
 * Ring grouping service for FraudTrace.
 * Rules:
 * 1. Start from entities involved in fraud alerts.
 * 2. Connect related alert entities.
 * 3. Prevent high-degree hubs from merging unrelated groups.
 * 4. Combine related findings into coherent fraud networks without double-counting evidence.
 * 5. Calculate deterministic ring risk score and contributors.
 * 6. Generate deterministic ring fingerprints derived from canonical member entities.
 */

export function groupAlertsIntoRings(detections, graph) {
  if (!detections || detections.length === 0) {
    return [];
  }

  // Build alert-entity connectivity graph
  const entityAdjacency = new Map(); // entityKey -> Set of neighbor entityKeys
  const entityMeta = new Map(); // entityKey -> { entityType, externalId, mongoId }

  function addEntity(entityType, externalId) {
    const key = `${entityType}:${externalId}`;
    if (!entityMeta.has(key)) {
      const node = graph.getNode(externalId);
      entityMeta.set(key, {
        entityType,
        externalId,
        mongoId: node ? node.mongoId : null,
      });
      entityAdjacency.set(key, new Set());
    }
    return key;
  }

  function addConnection(keyA, keyB) {
    if (keyA === keyB) return;
    entityAdjacency.get(keyA).add(keyB);
    entityAdjacency.get(keyB).add(keyA);
  }

  // Connect entities involved in each alert
  for (const detection of detections) {
    const alertEntityKeys = [];

    (detection.entities.accounts || []).forEach((acc) => {
      alertEntityKeys.push(addEntity('ACCOUNT', acc));
    });

    (detection.entities.devices || []).forEach((dev) => {
      alertEntityKeys.push(addEntity('DEVICE', dev));
    });

    (detection.entities.merchants || []).forEach((merch) => {
      alertEntityKeys.push(addEntity('MERCHANT', merch));
    });

    // Fully connect all entities in this single alert
    for (let i = 0; i < alertEntityKeys.length; i++) {
      for (let j = i + 1; j < alertEntityKeys.length; j++) {
        addConnection(alertEntityKeys[i], alertEntityKeys[j]);
      }
    }
  }

  // Extract connected components of the alert entity graph
  const visited = new Set();
  const rawRings = [];

  for (const startKey of entityAdjacency.keys()) {
    if (visited.has(startKey)) continue;

    const componentKeys = [];
    const queue = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift();
      componentKeys.push(current);

      for (const neighbor of entityAdjacency.get(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    rawRings.push(componentKeys);
  }

  // Format, fingerprint, and score each ring
  const rings = rawRings.map((componentKeys) => {
    // Deterministic canonical sorting of member entity keys
    const sortedEntityKeys = componentKeys.slice().sort();
    const rawKey = sortedEntityKeys.join('|');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
    const fingerprint = `RING:${hash}`;

    const memberSet = new Set(componentKeys);
    const members = componentKeys.map((k) => entityMeta.get(k));

    // Match alerts that belong to this ring
    const ringAlerts = detections.filter((det) => {
      const accKeys = (det.entities.accounts || []).map((a) => `ACCOUNT:${a}`);
      const devKeys = (det.entities.devices || []).map((d) => `DEVICE:${d}`);
      const merchKeys = (det.entities.merchants || []).map((m) => `MERCHANT:${m}`);
      const allDetKeys = [...accKeys, ...devKeys, ...merchKeys];
      return allDetKeys.some((k) => memberSet.has(k));
    });

    // Unique patterns
    const patterns = Array.from(new Set(ringAlerts.map((a) => a.pattern)));

    // Unique transactions to avoid double-counting flow/count (Constraint 7)
    const uniqueTxMap = new Map();
    for (const alert of ringAlerts) {
      for (const tx of alert.evidence.transactions || []) {
        if (!uniqueTxMap.has(tx.externalTransactionId)) {
          uniqueTxMap.set(tx.externalTransactionId, tx);
        }
      }
    }

    const uniqueTxs = Array.from(uniqueTxMap.values());
    const totalFlow = Math.round(uniqueTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0) * 100) / 100;
    const transactionCount = uniqueTxs.length;

    // Calculate deterministic Ring Risk Score
    const { score, contributors } = calculateRingRisk({
      patterns,
      totalFlow,
      memberCount: members.length,
      alertCount: ringAlerts.length,
      alerts: ringAlerts,
    });

    return {
      fingerprint,
      sortedEntityKeys,
      score,
      contributors,
      totalFlow,
      transactionCount,
      patterns,
      members,
      alerts: ringAlerts,
    };
  });

  // Sort rings deterministically: by score descending, then by fingerprint ascending
  return rings.sort((a, b) => b.score - a.score || a.fingerprint.localeCompare(b.fingerprint));
}

// Deterministic Ring Risk Scoring (FT-12, FT-13)
function calculateRingRisk({ patterns, totalFlow, memberCount, alertCount, alerts }) {
  const contributors = [];
  let rawScore = 0;

  // 1. Highest pattern severity weight
  let maxPatternWeight = 30;
  if (patterns.includes('MERCHANT_CASHOUT')) maxPatternWeight = 50;
  else if (patterns.includes('CIRCULAR_FLOW')) maxPatternWeight = 45;
  else if (patterns.includes('FAN_IN_FAN_OUT')) maxPatternWeight = 40;
  else if (patterns.includes('SHARED_DEVICE')) maxPatternWeight = 35;
  else if (patterns.includes('PASS_THROUGH')) maxPatternWeight = 30;

  contributors.push({
    signalName: 'PATTERNS_DETECTED',
    category: 'FRAUD_PATTERNS',
    weight: maxPatternWeight,
    score: maxPatternWeight,
    evidence: `Ring contains active fraud patterns: ${patterns.join(', ')}`,
    ruleVersion: 'v1.0.0',
  });
  rawScore += maxPatternWeight;

  // 2. Coordinated Flow Volume
  let flowScore = 0;
  if (totalFlow >= 25000) flowScore = 25;
  else if (totalFlow >= 10000) flowScore = 18;
  else if (totalFlow >= 5000) flowScore = 12;
  else flowScore = 5;

  contributors.push({
    signalName: 'COORDINATED_FLOW_VOLUME',
    category: 'TRANSACTION_BEHAVIOR',
    weight: 25,
    score: flowScore,
    evidence: `Total coordinated money movement across ring members is $${totalFlow}`,
    ruleVersion: 'v1.0.0',
  });
  rawScore += flowScore;

  // 3. Network Size and Multi-Alert Correlation
  let networkScore = 0;
  if (memberCount >= 4 || alertCount >= 2) networkScore = 25;
  else if (memberCount >= 3) networkScore = 18;
  else networkScore = 10;

  contributors.push({
    signalName: 'RING_CONNECTIVITY_DENSITY',
    category: 'NETWORK_BEHAVIOR',
    weight: 25,
    score: networkScore,
    evidence: `Ring connects ${memberCount} entities across ${alertCount} coordinated fraud alerts`,
    ruleVersion: 'v1.0.0',
  });
  rawScore += networkScore;

  // Clamp score between 0 and 100 per FT-12
  const finalScore = Math.min(100, Math.max(0, rawScore));

  return {
    score: finalScore,
    contributors,
  };
}
