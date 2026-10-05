import { Case } from '../../models/case.model.js';
import { CaseAlert } from '../../models/caseAlert.model.js';
import { CaseNote } from '../../models/caseNote.model.js';
import { Alert } from '../../models/alert.model.js';
import { FraudRing } from '../../models/fraudRing.model.js';
import { FraudRingMember } from '../../models/fraudRingMember.model.js';
import { Account } from '../../models/account.model.js';
import { Device } from '../../models/device.model.js';
import { Merchant } from '../../models/merchant.model.js';
import { Transaction } from '../../models/transaction.model.js';
import { AccountRisk } from '../../models/accountRisk.model.js';

/**
 * Builds a controlled, canonical evidence snapshot for an investigation case.
 * Does not introduce unpermitted database tables or unrestricted raw data.
 * Every item is assigned a stable evidence ID (e.g. E-ALERT-1, E-TX-1, E-FACT-1).
 *
 * @param {string} caseId - ObjectId of the Case
 * @returns {Promise<Object>} Controlled evidence snapshot
 */
export async function buildCaseEvidenceSnapshot(caseId) {
  const caseRecord = await Case.findById(caseId).populate('createdBy', 'name email').lean();
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.status = 404;
    throw error;
  }

  // 1. Case details
  const caseInfo = {
    id: caseRecord._id.toString(),
    caseNumber: caseRecord.caseNumber,
    title: caseRecord.title,
    status: caseRecord.status,
    disposition: caseRecord.disposition || 'UNSPECIFIED',
    createdBy: caseRecord.createdBy?.name || 'Unknown',
    createdAt: caseRecord.createdAt,
  };

  // 2. Attached Alerts
  const caseAlerts = await CaseAlert.find({ caseId }).lean();
  const alertIds = caseAlerts.map((ca) => ca.alertId);
  const alerts = await Alert.find({ _id: { $in: alertIds } })
    .populate('ringId', 'label score status fingerprint totalFlow transactionCount patterns')
    .lean();

  // 3. Fraud Rings & Ring Members
  const ringIds = [...new Set(alerts.map((a) => a.ringId?._id || a.ringId).filter(Boolean))];
  const rings = await FraudRing.find({ _id: { $in: ringIds } }).lean();

  const ringMembers = await FraudRingMember.find({ ringId: { $in: ringIds } })
    .populate('entityId')
    .lean();

  // 4. Notes
  const notes = await CaseNote.find({ caseId })
    .populate('authorId', 'name')
    .sort({ createdAt: 1 })
    .lean();

  // 5. Gather relevant Account, Device, and Merchant entity IDs
  const accountIds = new Set();
  const deviceIds = new Set();
  const merchantIds = new Set();
  const transactionIds = new Set();
  const externalTxIds = new Set();

  // Extract from alerts evidence
  alerts.forEach((alert) => {
    if (alert.evidence) {
      if (Array.isArray(alert.evidence.transactions)) {
        alert.evidence.transactions.forEach((tx) => {
          if (tx.externalTransactionId) externalTxIds.add(tx.externalTransactionId);
          if (tx.from) accountIds.add(tx.from);
          if (tx.to) accountIds.add(tx.to);
        });
      }
      if (alert.evidence.accounts && Array.isArray(alert.evidence.accounts)) {
        alert.evidence.accounts.forEach((acc) => accountIds.add(acc));
      }
      if (alert.evidence.device) {
        deviceIds.add(alert.evidence.device);
      }
      if (alert.evidence.merchant) {
        merchantIds.add(alert.evidence.merchant);
      }
    }
  });

  // Extract from ring members
  ringMembers.forEach((rm) => {
    if (rm.entityType === 'ACCOUNT') {
      accountIds.add(rm.entityId?._id?.toString() || rm.entityId?.toString());
      if (rm.entityId?.externalId) accountIds.add(rm.entityId.externalId);
    } else if (rm.entityType === 'DEVICE') {
      deviceIds.add(rm.entityId?._id?.toString() || rm.entityId?.toString());
      if (rm.entityId?.externalId) deviceIds.add(rm.entityId.externalId);
    } else if (rm.entityType === 'MERCHANT') {
      merchantIds.add(rm.entityId?._id?.toString() || rm.entityId?.toString());
      if (rm.entityId?.externalId) merchantIds.add(rm.entityId.externalId);
    }
  });

  // 6. Resolve Accounts, Devices, Merchants from DB
  const resolvedAccounts = await Account.find({
    $or: [
      { _id: { $in: [...accountIds].filter((id) => id && id.length === 24) } },
      { externalId: { $in: [...accountIds].filter(Boolean) } },
    ],
  }).lean();

  const resolvedDevices = await Device.find({
    $or: [
      { _id: { $in: [...deviceIds].filter((id) => id && id.length === 24) } },
      { externalId: { $in: [...deviceIds].filter(Boolean) } },
    ],
  }).lean();

  const resolvedMerchants = await Merchant.find({
    $or: [
      { _id: { $in: [...merchantIds].filter((id) => id && id.length === 24) } },
      { externalId: { $in: [...merchantIds].filter(Boolean) } },
    ],
  }).lean();

  // Fetch account risks
  const accountDbIds = resolvedAccounts.map((a) => a._id);
  const accountRisks = await AccountRisk.find({ accountId: { $in: accountDbIds } }).lean();
  const riskMap = {};
  accountRisks.forEach((r) => {
    riskMap[r.accountId.toString()] = r.score;
  });

  // 7. Resolve Transactions from DB
  const resolvedTransactions = await Transaction.find({
    $or: [
      { externalTransactionId: { $in: [...externalTxIds] } },
      { fromAccount: { $in: accountDbIds } },
      { toAccount: { $in: accountDbIds } },
    ],
  })
    .populate('fromAccount', 'externalId')
    .populate('toAccount', 'externalId')
    .populate('merchant', 'externalId')
    .populate('device', 'externalId')
    .sort({ timestamp: 1 })
    .limit(100) // bounded to prevent runaway payloads
    .lean();

  // 8. Derived Facts (Step 2 of Section 10.1: backend calculates arithmetic/metrics)
  const totalFlow = resolvedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const txCount = resolvedTransactions.length;
  const uniqueFromAccounts = new Set(
    resolvedTransactions.map((tx) => tx.fromAccount?.externalId).filter(Boolean)
  );
  const uniqueToDestinations = new Set(
    resolvedTransactions
      .map((tx) => tx.toAccount?.externalId || tx.merchant?.externalId)
      .filter(Boolean)
  );

  let earliestTx = null;
  let latestTx = null;
  if (resolvedTransactions.length > 0) {
    earliestTx = resolvedTransactions[0].timestamp;
    latestTx = resolvedTransactions[resolvedTransactions.length - 1].timestamp;
  }

  // 9. Build Evidence Catalog with stable IDs
  const evidenceCatalog = [];

  // Case item
  evidenceCatalog.push({
    id: 'E-CASE-1',
    type: 'CASE',
    summary: `Case ${caseInfo.caseNumber}: "${caseInfo.title}" (Status: ${caseInfo.status}, Disposition: ${caseInfo.disposition})`,
    data: caseInfo,
  });

  // Alert items
  alerts.forEach((alert, index) => {
    evidenceCatalog.push({
      id: `E-ALERT-${index + 1}`,
      type: 'ALERT',
      summary: `Alert on ${alert.pattern} (Severity: ${alert.severity}, Score: ${alert.score}, Triage: ${alert.triageStatus})`,
      data: {
        alertId: alert._id.toString(),
        pattern: alert.pattern,
        severity: alert.severity,
        score: alert.score,
        triageStatus: alert.triageStatus,
        evidenceSummary: alert.evidence?.summary || null,
        metrics: alert.evidence?.metrics || null,
      },
    });
  });

  // Ring items
  rings.forEach((ring, index) => {
    evidenceCatalog.push({
      id: `E-RING-${index + 1}`,
      type: 'RING',
      summary: `Fraud Ring ${ring.label} (Score: ${ring.score}, Status: ${ring.status}, Total Flow: ₹${ring.totalFlow?.toLocaleString() || 0})`,
      data: {
        ringId: ring._id.toString(),
        label: ring.label,
        score: ring.score,
        status: ring.status,
        patterns: ring.patterns,
        totalFlow: ring.totalFlow,
        transactionCount: ring.transactionCount,
      },
    });
  });

  // Entity items
  resolvedAccounts.forEach((acc, index) => {
    const score = riskMap[acc._id.toString()] ?? 0;
    evidenceCatalog.push({
      id: `E-ACC-${index + 1}`,
      type: 'ACCOUNT',
      summary: `Account ${acc.externalId} (Assessed Risk Score: ${score}/100)`,
      data: {
        accountId: acc._id.toString(),
        externalId: acc.externalId,
        riskScore: score,
      },
    });
  });

  resolvedDevices.forEach((dev, index) => {
    evidenceCatalog.push({
      id: `E-DEV-${index + 1}`,
      type: 'DEVICE',
      summary: `Device ${dev.externalId}`,
      data: {
        deviceId: dev._id.toString(),
        externalId: dev.externalId,
      },
    });
  });

  resolvedMerchants.forEach((m, index) => {
    evidenceCatalog.push({
      id: `E-MER-${index + 1}`,
      type: 'MERCHANT',
      summary: `Merchant ${m.externalId}`,
      data: {
        merchantId: m._id.toString(),
        externalId: m.externalId,
      },
    });
  });

  // Transaction items
  resolvedTransactions.forEach((tx, index) => {
    const dest = tx.toAccount?.externalId || tx.merchant?.externalId || 'UNKNOWN';
    const src = tx.fromAccount?.externalId || 'UNKNOWN';
    evidenceCatalog.push({
      id: `E-TX-${index + 1}`,
      type: 'TRANSACTION',
      summary: `Transaction ${tx.externalTransactionId}: ${src} transferred ₹${tx.amount.toLocaleString()} to ${dest} at ${new Date(tx.timestamp).toISOString()}`,
      data: {
        transactionId: tx._id.toString(),
        externalTransactionId: tx.externalTransactionId,
        fromAccount: src,
        destination: dest,
        amount: tx.amount,
        timestamp: tx.timestamp,
        device: tx.device?.externalId || null,
      },
    });
  });

  // Note items
  notes.forEach((note, index) => {
    evidenceCatalog.push({
      id: `E-NOTE-${index + 1}`,
      type: 'NOTE',
      summary: `Analyst Note (${note.authorId?.name || 'Analyst'}): "${note.content}"`,
      data: {
        noteId: note._id.toString(),
        author: note.authorId?.name || 'Analyst',
        content: note.content,
        createdAt: note.createdAt,
      },
    });
  });

  // Derived Fact items (Step 2)
  evidenceCatalog.push({
    id: 'E-FACT-1',
    type: 'DERIVED_METRIC',
    summary: `Aggregate Transaction Volume: ${txCount} transactions amounting to ₹${totalFlow.toLocaleString()}`,
    data: {
      transactionCount: txCount,
      totalVolume: totalFlow,
      uniqueSendersCount: uniqueFromAccounts.size,
      uniqueReceiversCount: uniqueToDestinations.size,
      earliestTransaction: earliestTx,
      latestTransaction: latestTx,
    },
  });

  // Assemble full canonical snapshot
  const rawSnapshot = {
    case: caseInfo,
    alerts: alerts.map((a) => ({
      id: a._id.toString(),
      pattern: a.pattern,
      severity: a.severity,
      score: a.score,
      triageStatus: a.triageStatus,
      evidenceSummary: a.evidence?.summary || null,
      metrics: a.evidence?.metrics || null,
    })),
    rings: rings.map((r) => ({
      id: r._id.toString(),
      label: r.label,
      score: r.score,
      status: r.status,
      patterns: r.patterns,
      totalFlow: r.totalFlow,
      transactionCount: r.transactionCount,
    })),
    entities: {
      accounts: resolvedAccounts.map((a) => ({
        id: a._id.toString(),
        externalId: a.externalId,
        riskScore: riskMap[a._id.toString()] ?? 0,
      })),
      devices: resolvedDevices.map((d) => ({
        id: d._id.toString(),
        externalId: d.externalId,
      })),
      merchants: resolvedMerchants.map((m) => ({
        id: m._id.toString(),
        externalId: m.externalId,
      })),
    },
    transactions: resolvedTransactions.map((tx) => ({
      id: tx._id.toString(),
      externalTransactionId: tx.externalTransactionId,
      fromAccount: tx.fromAccount?.externalId || 'UNKNOWN',
      destination: tx.toAccount?.externalId || tx.merchant?.externalId || 'UNKNOWN',
      amount: tx.amount,
      timestamp: tx.timestamp,
      device: tx.device?.externalId || null,
    })),
    notes: notes.map((n) => ({
      id: n._id.toString(),
      author: n.authorId?.name || 'Analyst',
      content: n.content,
      createdAt: n.createdAt,
    })),
    derivedFacts: {
      totalVolume: totalFlow,
      transactionCount: txCount,
      uniqueSendersCount: uniqueFromAccounts.size,
      uniqueReceiversCount: uniqueToDestinations.size,
      earliestTransaction: earliestTx,
      latestTransaction: latestTx,
    },
    evidenceCatalog,
  };

  return JSON.parse(JSON.stringify(rawSnapshot));
}

