/**
 * Deterministic, seeded demo data generator for FraudTrace.
 * Plants:
 * - Circular flow patterns
 * - Fan-in / Fan-out hubs
 * - Shared device rings (> 2 accounts)
 * - Rapid pass-through accounts
 * - Merchant cash-out groups
 * And realistic benign controls:
 * - 2-person legitimate shared device
 * - Near-miss cycle (non-closing, out-of-order)
 * - Near-miss fan-in/fan-out
 * - Near-miss pass-through (low ratio, wide delay)
 * - Popular high-volume merchant
 * - Background legitimate traffic
 */

class SimplePRNG {
  constructor(seed = 42) {
    this.m = 0x80000000; // 2^31
    this.a = 1103515245;
    this.c = 12345;
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat() {
    return this.nextInt() / (this.m - 1);
  }

  range(min, max) {
    return min + this.nextFloat() * (max - min);
  }
}

export function generateSimulationTransactions({ seed = 42, size = 'small' } = {}) {
  const prng = new SimplePRNG(seed);
  const transactions = [];
  const baseTime = new Date('2026-10-01T08:00:00.000Z').getTime();

  let txCounter = 1;
  function nextTxId(prefix = 'TX') {
    const idStr = String(txCounter++).padStart(5, '0');
    return `S${seed}-${prefix}-${idStr}`;
  }

  const plantedPatterns = {
    circularFlow: [],
    fanInFanOut: [],
    sharedDevice: [],
    passThrough: [],
    merchantCashOut: [],
    nearMisses: [],
    controls: [],
  };

  // 1. Planted Circular Flow 1 (3-hop cycle, chronological)
  const c1A = 'ACC-CIRC-1A';
  const c1B = 'ACC-CIRC-1B';
  const c1C = 'ACC-CIRC-1C';
  const c1Time1 = baseTime + 10 * 60 * 1000;
  const c1Time2 = baseTime + 40 * 60 * 1000;
  const c1Time3 = baseTime + 90 * 60 * 1000;

  transactions.push({
    externalTransactionId: nextTxId('CF'),
    fromAccount: c1A,
    toAccount: c1B,
    merchant: null,
    device: 'DEV-C1-A',
    amount: 12500,
    timestamp: new Date(c1Time1).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('CF'),
    fromAccount: c1B,
    toAccount: c1C,
    merchant: null,
    device: 'DEV-C1-B',
    amount: 12200,
    timestamp: new Date(c1Time2).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('CF'),
    fromAccount: c1C,
    toAccount: c1A,
    merchant: null,
    device: 'DEV-C1-C',
    amount: 12000,
    timestamp: new Date(c1Time3).toISOString(),
  });
  plantedPatterns.circularFlow.push({
    accounts: [c1A, c1B, c1C],
    description: '3-hop circular flow within 90 minutes',
  });

  // 2. Planted Fan-In / Fan-Out Hub
  const hub = 'ACC-HUB-ALPHA';
  const senders = ['ACC-FIN-1', 'ACC-FIN-2', 'ACC-FIN-3', 'ACC-FIN-4'];
  const receivers = ['ACC-FOUT-1', 'ACC-FOUT-2', 'ACC-FOUT-3'];

  senders.forEach((s, idx) => {
    transactions.push({
      externalTransactionId: nextTxId('FIFO'),
      fromAccount: s,
      toAccount: hub,
      merchant: null,
      device: `DEV-FIN-${idx + 1}`,
      amount: 4000 + idx * 500,
      timestamp: new Date(baseTime + (2 + idx) * 3600 * 1000).toISOString(),
    });
  });

  receivers.forEach((r, idx) => {
    transactions.push({
      externalTransactionId: nextTxId('FIFO'),
      fromAccount: hub,
      toAccount: r,
      merchant: null,
      device: 'DEV-HUB-MGR',
      amount: 5000 + idx * 300,
      timestamp: new Date(baseTime + (7 + idx) * 3600 * 1000).toISOString(),
    });
  });
  plantedPatterns.fanInFanOut.push({
    hub,
    senders,
    receivers,
    description: 'Hub receiving from 4 accounts and dispersing to 3 accounts within 8 hours',
  });

  // 3. Planted Shared Device (> 2 accounts, high correlation)
  const sharedDev = 'DEV-CLUSTER-99';
  const sharedAccounts = ['ACC-SHDEV-1', 'ACC-SHDEV-2', 'ACC-SHDEV-3', 'ACC-SHDEV-4'];
  for (let i = 0; i < sharedAccounts.length - 1; i++) {
    transactions.push({
      externalTransactionId: nextTxId('SHDEV'),
      fromAccount: sharedAccounts[i],
      toAccount: sharedAccounts[i + 1],
      merchant: null,
      device: sharedDev,
      amount: 3200 + i * 400,
      timestamp: new Date(baseTime + (12 + i) * 3600 * 1000).toISOString(),
    });
  }
  plantedPatterns.sharedDevice.push({
    device: sharedDev,
    accounts: sharedAccounts,
    description: '4 suspicious accounts sharing the same device ID',
  });

  // 4. Planted Pass-Through Behavior
  const passAcc = 'ACC-PASSTHRU-1';
  const passInSenders = ['ACC-PTP-IN1', 'ACC-PTP-IN2'];
  const passOutReceivers = ['ACC-PTP-OUT1', 'ACC-PTP-OUT2'];

  passInSenders.forEach((inS, idx) => {
    const inTime = baseTime + (18 + idx * 4) * 3600 * 1000;
    const outTime = inTime + 18 * 60 * 1000; // 18 mins later
    const inAmount = 9000;
    const outAmount = 8550; // 95% forwarded

    transactions.push({
      externalTransactionId: nextTxId('PTP'),
      fromAccount: inS,
      toAccount: passAcc,
      merchant: null,
      device: `DEV-PTP-IN-${idx + 1}`,
      amount: inAmount,
      timestamp: new Date(inTime).toISOString(),
    });

    transactions.push({
      externalTransactionId: nextTxId('PTP'),
      fromAccount: passAcc,
      toAccount: passOutReceivers[idx],
      merchant: null,
      device: 'DEV-PASSTHRU-OPS',
      amount: outAmount,
      timestamp: new Date(outTime).toISOString(),
    });
  });
  plantedPatterns.passThrough.push({
    account: passAcc,
    forwardingRatio: 0.95,
    description: 'Repeated fast forwarding of 95% of incoming funds within 18 minutes',
  });

  // 5. Planted Merchant Cash-Out
  const cashoutMerchant = 'MERCH-CASHOUT-SHELL';
  const mcoDevice = 'DEV-MCO-SHARED';
  const mcoAccounts = ['ACC-MCO-1', 'ACC-MCO-2', 'ACC-MCO-3'];

  mcoAccounts.forEach((acc, idx) => {
    transactions.push({
      externalTransactionId: nextTxId('MCO'),
      fromAccount: acc,
      toAccount: null,
      merchant: cashoutMerchant,
      device: mcoDevice,
      amount: 4800 + idx * 150,
      timestamp: new Date(baseTime + (26 * 3600 + idx * 15 * 60) * 1000).toISOString(),
    });
  });
  plantedPatterns.merchantCashOut.push({
    merchant: cashoutMerchant,
    device: mcoDevice,
    accounts: mcoAccounts,
    description: '3 related accounts sharing device paying same merchant in tight window',
  });

  // 6. Benign Controls: Legitimate Shared Device (exactly 2 accounts)
  const legitDevice = 'DEV-HOME-TABLET';
  transactions.push({
    externalTransactionId: nextTxId('LEGIT'),
    fromAccount: 'ACC-FAMILY-1',
    toAccount: 'ACC-GROCERY-STORE',
    merchant: null,
    device: legitDevice,
    amount: 145.2,
    timestamp: new Date(baseTime + 28 * 3600 * 1000).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('LEGIT'),
    fromAccount: 'ACC-FAMILY-2',
    toAccount: 'ACC-UTILITY-CO',
    merchant: null,
    device: legitDevice,
    amount: 88.5,
    timestamp: new Date(baseTime + 29 * 3600 * 1000).toISOString(),
  });
  plantedPatterns.controls.push({
    name: '2-person shared device',
    device: legitDevice,
    accounts: ['ACC-FAMILY-1', 'ACC-FAMILY-2'],
  });

  // 7. Benign Controls: Popular Merchant (High degree, unrelated payers)
  const popularMerchant = 'MERCH-MEGASTORE-RETAIL';
  for (let i = 1; i <= 12; i++) {
    transactions.push({
      externalTransactionId: nextTxId('LEGIT'),
      fromAccount: `ACC-CUSTOMER-${i}`,
      toAccount: null,
      merchant: popularMerchant,
      device: `DEV-MOBILE-${i}`,
      amount: Math.round(prng.range(15, 250) * 100) / 100,
      timestamp: new Date(baseTime + (30 + i * 2) * 3600 * 1000).toISOString(),
    });
  }
  plantedPatterns.controls.push({
    name: 'Popular merchant',
    merchant: popularMerchant,
    payerCount: 12,
  });

  // 8. Near-Miss Patterns
  // 8a. Broken Cycle (A -> B -> C -> D, never returns to A)
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-NM-A',
    toAccount: 'ACC-NM-B',
    merchant: null,
    device: 'DEV-NM-1',
    amount: 5000,
    timestamp: new Date(baseTime + 40 * 3600 * 1000).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-NM-B',
    toAccount: 'ACC-NM-C',
    merchant: null,
    device: 'DEV-NM-2',
    amount: 4900,
    timestamp: new Date(baseTime + 41 * 3600 * 1000).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-NM-C',
    toAccount: 'ACC-NM-D',
    merchant: null,
    device: 'DEV-NM-3',
    amount: 4800,
    timestamp: new Date(baseTime + 42 * 3600 * 1000).toISOString(),
  });
  plantedPatterns.nearMisses.push({
    name: 'Broken cycle',
    accounts: ['ACC-NM-A', 'ACC-NM-B', 'ACC-NM-C', 'ACC-NM-D'],
  });

  // 8b. Out-of-order Cycle (timestamps flow backward, so not a causal circular flow)
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-BACK-1',
    toAccount: 'ACC-BACK-2',
    merchant: null,
    device: 'DEV-BACK-1',
    amount: 3000,
    timestamp: new Date(baseTime + 50 * 3600 * 1000).toISOString(),
  });
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-BACK-2',
    toAccount: 'ACC-BACK-3',
    merchant: null,
    device: 'DEV-BACK-2',
    amount: 2900,
    timestamp: new Date(baseTime + 48 * 3600 * 1000).toISOString(), // earlier!
  });
  transactions.push({
    externalTransactionId: nextTxId('NM-CF'),
    fromAccount: 'ACC-BACK-3',
    toAccount: 'ACC-BACK-1',
    merchant: null,
    device: 'DEV-BACK-3',
    amount: 2800,
    timestamp: new Date(baseTime + 46 * 3600 * 1000).toISOString(), // even earlier!
  });
  plantedPatterns.nearMisses.push({
    name: 'Out of order cycle',
    accounts: ['ACC-BACK-1', 'ACC-BACK-2', 'ACC-BACK-3'],
  });

  // 9. Additional background traffic based on size preset
  const targetTotal = size === 'medium' ? 500 : 120;
  let bgIdx = 1;

  while (transactions.length < targetTotal) {
    const accNum = (bgIdx % 30) + 1;
    const fromId = `ACC-BENIGN-${accNum}`;
    const toId = `ACC-BENIGN-${((bgIdx + 7) % 30) + 1}`;
    const devId = `DEV-BENIGN-${accNum}`;
    const amount = Math.round(prng.range(20, 1500) * 100) / 100;
    const timeOffset = (55 + bgIdx) * 3600 * 1000;

    // 25% of transactions pay a merchant
    const isMerchantTx = bgIdx % 4 === 0;
    const merchantId = isMerchantTx ? `MERCH-STORE-${(bgIdx % 5) + 1}` : null;

    transactions.push({
      externalTransactionId: nextTxId('NORM'),
      fromAccount: fromId,
      toAccount: isMerchantTx ? null : toId,
      merchant: merchantId,
      device: devId,
      amount,
      timestamp: new Date(baseTime + timeOffset).toISOString(),
    });
    bgIdx++;
  }

  return {
    transactions,
    plantedPatterns,
    totalCount: transactions.length,
    seed,
    size,
  };
}
