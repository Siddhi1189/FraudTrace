import crypto from 'crypto';
import { DEFAULT_DETECTOR_CONFIG, RULE_VERSION } from '../detectors/detectorConfig.js';
import { formatAmount } from '../../utils/format.js';

/**
 * Ring grouping service for FraudTrace.
 * Rules:
 * 1. Start from entities involved in fraud alerts.
 * 2. Connect related alert entities.
 * 3. Prevent high-degree hubs (> maxAlertHubDegree) from merging unrelated groups.
 * 4. Device nodes only bridge alerts if linked to >= sharedDeviceThreshold distinct accounts.
 * 5. Combine related findings into coherent fraud networks without double-counting evidence.
 * 6. Calculate deterministic ring risk score and contributors.
 * 7. Generate deterministic ring fingerprints derived from canonical member entities.
 * PLACEHOLDER(FT-29): Ring grouping alert hub limit and device threshold
 */

export function groupAlertsIntoRings(detections, graph, customConfig = {}) {
  if (!detections || detections.length === 0) {
    return [];
  }

  const maxAlertHubDegree = customConfig.maxAlertHubDegree ?? DEFAULT_DETECTOR_CONFIG.maxAlertHubDegree ?? 3;
  const sharedDeviceThreshold = customConfig.sharedDeviceThreshold ?? DEFAULT_DETECTOR_CONFIG.sharedDeviceThreshold ?? 3;

  // Track entity alert frequency across detections
  const entityAlertCounts = new Map();
  for (const detection of detections) {
    const keysInAlert = new Set([
      ...(detection.entities.accounts || []).map((a) => `ACCOUNT:${a}`),
      ...(detection.entities.devices || []).map((d) => `DEVICE:${d}`),
      ...(detection.entities.merchants || []).map((m) => `MERCHANT:${m}`),
    ]);
    for (const key of keysInAlert) {
      entityAlertCounts.set(key, (entityAlertCounts.get(key) || 0) + 1);
    }
  }

  function canBridge(key) {
    // Entities appearing in more than maxAlertHubDegree alerts are hubs and excluded from bridging
    if ((entityAlertCounts.get(key) || 0) > maxAlertHubDegree) {
      return false;
    }
    // Device nodes only bridge alerts if linked to at least sharedDeviceThreshold distinct accounts
    if (key.startsWith('DEVICE:')) {
      const devEdges = (graph.reverseAdjacency?.get(key) || []).filter((e) => e.type === 'USED_DEVICE');
      const distinctAccs = new Set(devEdges.map((e) => e.sourceKey));
      if (distinctAccs.size < sharedDeviceThreshold) {
        return false;
      }
    }
    return true;
  }

  // Map each detection to its entity keys
  const alertEntitiesList = detections.map((det) => {
    const keys = new Set();
    (det.entities.accounts || []).forEach((a) => keys.add(`ACCOUNT:${a}`));
    (det.entities.devices || []).forEach((d) => keys.add(`DEVICE:${d}`));
    (det.entities.merchants || []).forEach((m) => keys.add(`MERCHANT:${m}`));
    return keys;
  });

  // Build alert adjacency graph: connect alerts that share at least one eligible bridging entity
  const n = detections.length;
  const alertAdjacency = Array.from({ length: n }, () => new Set());

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sharesBridgingEntity = false;
      for (const key of alertEntitiesList[i]) {
        if (alertEntitiesList[j].has(key) && canBridge(key)) {
          sharesBridgingEntity = true;
          break;
        }
      }
      if (sharesBridgingEntity) {
        alertAdjacency[i].add(j);
        alertAdjacency[j].add(i);
      }
    }
  }

  // Find connected components of alerts
  const visitedAlerts = new Set();
  const alertComponents = [];

  for (let i = 0; i < n; i++) {
    if (visitedAlerts.has(i)) continue;

    const component = [];
    const queue = [i];
    visitedAlerts.add(i);

    while (queue.length > 0) {
      const curr = queue.shift();
      component.push(curr);

      for (const neighbor of alertAdjacency[curr]) {
        if (!visitedAlerts.has(neighbor)) {
          visitedAlerts.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    alertComponents.push(component);
  }

  // Build ring objects from alert components
  const rings = alertComponents.map((componentAlertIndices) => {
    const ringAlerts = componentAlertIndices.map((idx) => detections[idx]);

    // Union of all entity keys across alerts in this ring
    const memberKeySet = new Set();
    componentAlertIndices.forEach((idx) => {
      alertEntitiesList[idx].forEach((k) => memberKeySet.add(k));
    });

    const sortedEntityKeys = Array.from(memberKeySet).sort();
    const rawKey = sortedEntityKeys.join('|');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
    const fingerprint = `RING:${hash}`;

    // Resolve member details
    const members = sortedEntityKeys.map((k) => {
      const [entityType, ...rest] = k.split(':');
      const externalId = rest.join(':');
      const node = graph.getNode(externalId);
      return {
        entityType,
        externalId,
        mongoId: node ? node.mongoId : null,
      };
    });

    // Unique patterns
    const patterns = Array.from(new Set(ringAlerts.map((a) => a.pattern)));

    // Unique transactions to avoid double-counting flow/count
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
    ruleVersion: RULE_VERSION,
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
    evidence: `Total coordinated money movement across ring members is ${formatAmount(totalFlow)}`,
    ruleVersion: RULE_VERSION,
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
    ruleVersion: RULE_VERSION,
  });
  rawScore += networkScore;

  // Clamp score between 0 and 100 per FT-12
  const finalScore = Math.min(100, Math.max(0, rawScore));

  return {
    score: finalScore,
    contributors,
  };
}
