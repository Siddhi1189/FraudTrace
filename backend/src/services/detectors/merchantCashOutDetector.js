import { DEFAULT_DETECTOR_CONFIG } from './detectorConfig.js';
import { formatAmount } from '../../utils/format.js';

// PLACEHOLDER(FT-28): Merchant cash-out strict subset deduplication and requireSharedDevice flag
export function runMerchantCashOutDetector(graph, customConfig = {}) {
  const config = { ...DEFAULT_DETECTOR_CONFIG.merchantCashOut, ...customConfig };
  const requireSharedDevice = config.requireSharedDevice !== false;
  const detections = [];

  const merchantKeys = Array.from(graph.nodes.keys()).filter((k) => k.startsWith('MERCHANT:'));

  for (const merchKey of merchantKeys) {
    const merchNode = graph.nodes.get(merchKey);
    const paymentEdges = (graph.reverseAdjacency.get(merchKey) || []).filter((e) => e.type === 'PAYMENT');

    if (paymentEdges.length < config.minRelatedAccounts) continue;

    // Sort payment edges chronologically
    const sortedPayments = [...paymentEdges].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Map each account to its devices
    function getDevicesForAccount(accKey) {
      const devEdges = (graph.adjacency.get(accKey) || []).filter((e) => e.type === 'USED_DEVICE');
      return new Set(devEdges.map((e) => e.targetKey));
    }

    // Sliding window over payments to check for shared device/relationship
    for (let i = 0; i < sortedPayments.length; i++) {
      const basePay = sortedPayments[i];
      const baseAccKey = basePay.sourceKey;
      const baseDevices = getDevicesForAccount(baseAccKey);

      const relatedPayments = [basePay];
      const relatedAccounts = new Set([graph.nodes.get(baseAccKey).externalId]);
      const sharedDevicesFound = new Set();

      for (let j = i + 1; j < sortedPayments.length; j++) {
        const otherPay = sortedPayments[j];
        const timeDiff = otherPay.timestamp.getTime() - basePay.timestamp.getTime();

        if (timeDiff > config.maxTimeWindowMs) break;

        const otherAccKey = otherPay.sourceKey;
        if (otherAccKey === baseAccKey) continue; // Same account multiple payments

        // Check if other account shares a device with base or any related account
        const otherDevices = getDevicesForAccount(otherAccKey);
        let isRelated = false;

        if (!requireSharedDevice) {
          isRelated = true;
        } else {
          for (const dev of otherDevices) {
            if (baseDevices.has(dev)) {
              isRelated = true;
              sharedDevicesFound.add(graph.nodes.get(dev).externalId);
            }
          }
        }

        if (isRelated) {
          relatedPayments.push(otherPay);
          relatedAccounts.add(graph.nodes.get(otherAccKey).externalId);
        }
      }

      if (relatedAccounts.size >= config.minRelatedAccounts) {
        const sortedAccs = Array.from(relatedAccounts).sort();
        const fingerprint = `MERCHANT_CASHOUT:${merchNode.externalId}:${sortedAccs.join(':')}`;

        // Ensure we haven't already reported this group
        if (!detections.some((d) => d.fingerprint === fingerprint)) {
          const evidenceTxs = relatedPayments.map((e) => ({
            externalTransactionId: e.externalTransactionId,
            fromAccount: graph.nodes.get(e.sourceKey).externalId,
            toAccount: null,
            merchant: merchNode.externalId,
            device: null,
            amount: e.amount,
            timestamp: e.timestamp.toISOString(),
          }));

          const totalCashOut = relatedPayments.reduce((sum, e) => sum + (e.amount || 0), 0);

          detections.push({
            pattern: 'MERCHANT_CASHOUT',
            fingerprint,
            entities: {
              accounts: sortedAccs,
              devices: Array.from(sharedDevicesFound),
              merchants: [merchNode.externalId],
            },
            evidence: {
              summary: `${relatedAccounts.size} related accounts sharing devices [${Array.from(sharedDevicesFound).join(', ')}] routed coordinated payments totaling ${formatAmount(totalCashOut)} to merchant ${merchNode.externalId} within a 2-hour window.`,
              transactions: evidenceTxs,
              metrics: {
                merchantId: merchNode.externalId,
                relatedAccountsCount: relatedAccounts.size,
                totalAmount: totalCashOut,
                sharedDevices: Array.from(sharedDevicesFound),
              },
            },
            severity: 'CRITICAL',
            score: 90,
          });
        }
      }
    }
  }

  // Drop any detection whose account set is a strict subset of another detection
  // for the same merchant in an overlapping window.
  const filteredDetections = detections.filter((detA) => {
    const accountsA = new Set(detA.entities.accounts);
    const merchA = detA.entities.merchants[0];
    const txTimesA = detA.evidence.transactions.map((t) => new Date(t.timestamp).getTime());
    const startA = Math.min(...txTimesA);
    const endA = Math.max(...txTimesA);

    const isStrictSubset = detections.some((detB) => {
      if (detA === detB) return false;
      const merchB = detB.entities.merchants[0];
      if (merchA !== merchB) return false;

      const accountsB = new Set(detB.entities.accounts);
      if (accountsA.size >= accountsB.size) return false;

      for (const acc of accountsA) {
        if (!accountsB.has(acc)) return false;
      }

      const txTimesB = detB.evidence.transactions.map((t) => new Date(t.timestamp).getTime());
      const startB = Math.min(...txTimesB);
      const endB = Math.max(...txTimesB);

      const overlaps = !(endA < startB || startA > endB);
      return overlaps;
    });

    return !isStrictSubset;
  });

  return filteredDetections;
}
