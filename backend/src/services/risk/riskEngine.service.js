import { DEFAULT_DETECTOR_CONFIG, RULE_VERSION } from '../detectors/detectorConfig.js';

/**
 * Deterministic Explainable Risk Engine for Accounts.
 * Evaluates 4 signal categories with explicit category contribution caps:
 * 1. Fraud Patterns: Direct involvement (Cap: 50 pts; formula: 30 + 10 * detections)
 * 2. Network Behavior: Ring membership (Cap: 25 pts) & Shared Device (Cap: 15 pts)
 * 3. Transaction Behavior: Velocity (Cap: 15 pts; awarded 12 pts for >= 5 transfers)
 * 4. Temporal Behavior: Rapid Pass-Through Flow (Cap: 15 pts; awarded 15 pts for pass-through)
 * PLACEHOLDER(FT-27): RULE_VERSION v1.0.1 and >= 3 distinct accounts requirement for DEVICE_ASSOCIATION
 */

export function calculateAccountRisk({
  accountNode,
  graph,
  detections = [],
  rings = [],
}) {
  const accountId = accountNode.externalId;
  const contributors = [];
  let totalScore = 0;

  // 1. FRAUD PATTERNS: Direct involvement in detected fraud patterns (Cap: 50 pts)
  const accountDetections = detections.filter((d) =>
    (d.entities.accounts || []).includes(accountId)
  );

  if (accountDetections.length > 0) {
    const patternNames = Array.from(new Set(accountDetections.map((d) => d.pattern)));
    const patternWeight = Math.min(50, 30 + accountDetections.length * 10);

    contributors.push({
      signalName: 'FRAUD_PATTERN_INVOLVEMENT',
      category: 'FRAUD_PATTERNS',
      signalValue: patternNames.join(', '),
      maxCap: 50,
      weight: 50,
      score: patternWeight,
      pointsAwarded: patternWeight,
      evidence: `Directly implicated in ${accountDetections.length} fraud detection alert(s): ${patternNames.join(', ')}`,
      ruleVersion: RULE_VERSION,
    });
    totalScore += patternWeight;
  }

  // 2. NETWORK BEHAVIOR: Ring membership and suspicious connectivity (Cap: 25 pts)
  const accountRings = rings.filter((r) =>
    r.members.some((m) => m.entityType === 'ACCOUNT' && m.externalId === accountId)
  );

  if (accountRings.length > 0) {
    const ringLabels = accountRings.map((r) => r.label);
    const ringWeight = 25;

    contributors.push({
      signalName: 'FRAUD_RING_MEMBERSHIP',
      category: 'NETWORK_BEHAVIOR',
      signalValue: ringLabels.join(', '),
      maxCap: 25,
      weight: 25,
      score: ringWeight,
      pointsAwarded: ringWeight,
      evidence: `Identified as active node in coordinated fraud ring: ${ringLabels.join(', ')}`,
      ruleVersion: RULE_VERSION,
    });
    totalScore += ringWeight;
  }

  // Suspicious Neighbors / Degree: Shared Device Association (Cap: 15 pts)
  // R1: Only award if device is used by >= DEFAULT_DETECTOR_CONFIG.sharedDevice.minDistinctAccounts accounts (Doc 5.3)
  const key = `ACCOUNT:${accountId}`;
  const outEdges = graph.adjacency.get(key) || [];
  const inEdges = graph.reverseAdjacency.get(key) || [];

  const minSharedAccounts = DEFAULT_DETECTOR_CONFIG.sharedDevice?.minDistinctAccounts || 3;
  const usedDeviceEdges = outEdges.filter((e) => e.type === 'USED_DEVICE');
  const eligibleSharedDeviceEdges = usedDeviceEdges.filter((e) => {
    const devKey = e.targetKey;
    const devAccEdges = (graph.reverseAdjacency.get(devKey) || []).filter((de) => de.type === 'USED_DEVICE');
    const distinctAccs = new Set(devAccEdges.map((de) => de.sourceKey));
    return distinctAccs.size >= minSharedAccounts;
  });

  if (eligibleSharedDeviceEdges.length > 0) {
    const deviceIds = eligibleSharedDeviceEdges.map((e) => graph.nodes.get(e.targetKey).externalId);
    contributors.push({
      signalName: 'DEVICE_ASSOCIATION',
      category: 'NETWORK_BEHAVIOR',
      signalValue: `${eligibleSharedDeviceEdges.length} shared device link(s)`,
      maxCap: 15,
      weight: 15,
      score: 10,
      pointsAwarded: 10,
      evidence: `Associated with shared device(s) linked to ≥ ${minSharedAccounts} accounts: ${deviceIds.join(', ')}`,
      ruleVersion: RULE_VERSION,
    });
    totalScore += 10;
  }

  // 3. TRANSACTION BEHAVIOR: Velocity & Flow concentration (Cap: 15 pts)
  const transferTxs = [
    ...outEdges.filter((e) => e.type === 'TRANSFER' || e.type === 'PAYMENT'),
    ...inEdges.filter((e) => e.type === 'TRANSFER'),
  ];

  if (transferTxs.length >= 5) {
    contributors.push({
      signalName: 'TRANSACTION_VELOCITY',
      category: 'TRANSACTION_BEHAVIOR',
      signalValue: `${transferTxs.length} transactions`,
      maxCap: 15,
      weight: 15,
      score: 12,
      pointsAwarded: 12,
      evidence: `High transaction frequency (${transferTxs.length} transfers observed)`,
      ruleVersion: RULE_VERSION,
    });
    totalScore += 12;
  }

  // 4. TEMPORAL BEHAVIOR: Pass-through or fast turnaround (Cap: 15 pts)
  const hasPassThrough = accountDetections.some((d) => d.pattern === 'PASS_THROUGH');
  if (hasPassThrough) {
    contributors.push({
      signalName: 'RAPID_PASS_THROUGH_FLOW',
      category: 'TEMPORAL_BEHAVIOR',
      signalValue: 'Rapid Forwarding',
      maxCap: 15,
      weight: 15,
      score: 15,
      pointsAwarded: 15,
      evidence: 'Observed rapid fund forwarding matching pass-through layering behavior',
      ruleVersion: RULE_VERSION,
    });
    totalScore += 15;
  }

  // Clamp score 0 to 100 per FT-12
  const finalScore = Math.min(100, Math.max(0, totalScore));

  // Sort contributors by score descending for "Why Flagged?" explanation
  contributors.sort((a, b) => b.score - a.score);

  // Generate top explanations
  const whyFlagged = contributors.slice(0, 3).map((c) => c.evidence);
  if (whyFlagged.length === 0) {
    whyFlagged.push('Routine baseline account activity; no suspicious signals detected.');
  }

  return {
    score: finalScore,
    contributors,
    whyFlagged,
    ruleVersion: RULE_VERSION,
  };
}
