import { Account } from '../models/account.model.js';
import { Device } from '../models/device.model.js';
import { Merchant } from '../models/merchant.model.js';
import { Transaction } from '../models/transaction.model.js';
import { DataBatch } from '../models/dataBatch.model.js';
import { generateSimulationTransactions } from '../simulation/generator.js';
import { invalidateGraphCache } from './graph/graphBuilder.js';

export async function ingestTransactions({ records = [], source, seed = null, preRejectedRows = [] }) {
  if (!['CSV_UPLOAD', 'SIMULATION'].includes(source)) {
    const error = new Error(`Invalid data source: ${source}`);
    error.statusCode = 400;
    throw error;
  }

  const batch = new DataBatch({
    source,
    seed,
    totalRows: 0,
    acceptedRows: 0,
    rejectedRows: preRejectedRows.length,
    duplicateRows: 0,
    errors: [...preRejectedRows],
  });
  await batch.save();

  if (records.length === 0) {
    batch.totalRows = preRejectedRows.length;
    await batch.save();
    return batch;
  }

  // Check duplicates within batch and against database
  const seenInBatch = new Set();
  const nonDuplicateRecords = [];
  let withinBatchDuplicates = 0;

  for (const rec of records) {
    if (seenInBatch.has(rec.externalTransactionId)) {
      withinBatchDuplicates++;
      batch.errors.push({
        externalTransactionId: rec.externalTransactionId,
        reason: 'Duplicate externalTransactionId within current batch',
      });
    } else {
      seenInBatch.add(rec.externalTransactionId);
      nonDuplicateRecords.push(rec);
    }
  }

  // Check global uniqueness against existing transactions in MongoDB
  const externalIds = nonDuplicateRecords.map((r) => r.externalTransactionId);
  const existingTxs = await Transaction.find(
    { externalTransactionId: { $in: externalIds } },
    { externalTransactionId: 1 }
  ).lean();

  const existingIdSet = new Set(existingTxs.map((t) => t.externalTransactionId));
  const candidateRecords = [];
  let dbDuplicates = 0;

  for (const rec of nonDuplicateRecords) {
    if (existingIdSet.has(rec.externalTransactionId)) {
      dbDuplicates++;
      batch.errors.push({
        externalTransactionId: rec.externalTransactionId,
        reason: 'Duplicate externalTransactionId already exists in database',
      });
    } else {
      candidateRecords.push(rec);
    }
  }

  const totalDuplicates = withinBatchDuplicates + dbDuplicates;

  if (candidateRecords.length === 0) {
    batch.totalRows = preRejectedRows.length + records.length;
    batch.duplicateRows = totalDuplicates;
    batch.acceptedRows = 0;
    await batch.save();
    return batch;
  }

  // Collect unique entity external IDs
  const accountIds = new Set();
  const merchantIds = new Set();
  const deviceIds = new Set();

  candidateRecords.forEach((r) => {
    if (r.fromAccount) accountIds.add(r.fromAccount);
    if (r.toAccount) accountIds.add(r.toAccount);
    if (r.merchant) merchantIds.add(r.merchant);
    if (r.device) deviceIds.add(r.device);
  });

  // Upsert entities concurrently
  const [accountMap, merchantMap, deviceMap] = await Promise.all([
    upsertAndResolveEntities(Account, Array.from(accountIds)),
    upsertAndResolveEntities(Merchant, Array.from(merchantIds)),
    upsertAndResolveEntities(Device, Array.from(deviceIds)),
  ]);

  // Construct transaction documents with resolved ObjectIds
  const transactionDocs = candidateRecords.map((r) => ({
    externalTransactionId: r.externalTransactionId,
    fromAccount: accountMap[r.fromAccount],
    toAccount: r.toAccount ? accountMap[r.toAccount] : null,
    merchant: r.merchant ? merchantMap[r.merchant] : null,
    device: r.device ? deviceMap[r.device] : null,
    amount: r.amount,
    timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
    batchId: batch._id,
  }));

  // Batch insert transactions with duplicate key handling
  let insertedCount = 0;
  let bulkDuplicates = 0;
  try {
    const insertedTxs = await Transaction.insertMany(transactionDocs, { ordered: false });
    insertedCount = insertedTxs.length;
  } catch (err) {
    if (err.name === 'MongoBulkWriteError' || err.code === 11000 || err.writeErrors) {
      insertedCount = err.result?.nInserted ?? (err.insertedDocs ? err.insertedDocs.length : 0);
      bulkDuplicates = (err.writeErrors ? err.writeErrors.length : 0);
    } else {
      throw err;
    }
  }

  batch.acceptedRows = insertedCount;
  batch.duplicateRows = totalDuplicates + bulkDuplicates;
  batch.totalRows = preRejectedRows.length + records.length;

  await batch.save();
  invalidateGraphCache();
  return batch;
}

async function upsertAndResolveEntities(Model, externalIds) {
  if (!externalIds || externalIds.length === 0) {
    return {};
  }

  const bulkOps = externalIds.map((externalId) => ({
    updateOne: {
      filter: { externalId },
      update: { $setOnInsert: { externalId, metadata: {} } },
      upsert: true,
    },
  }));

  await Model.bulkWrite(bulkOps, { ordered: false });

  const docs = await Model.find({ externalId: { $in: externalIds } }, { _id: 1, externalId: 1 }).lean();
  const map = {};
  docs.forEach((doc) => {
    map[doc.externalId] = doc._id;
  });
  return map;
}

export async function simulateData({ seed = 42, size = 'small' } = {}) {
  const sim = generateSimulationTransactions({ seed, size });
  const batch = await ingestTransactions({
    records: sim.transactions,
    source: 'SIMULATION',
    seed,
  });
  return {
    batch,
    plantedSummary: sim.plantedPatterns,
  };
}

export async function getBatches() {
  return DataBatch.find().sort({ createdAt: -1 }).lean();
}

export async function getBatchById(batchId) {
  const batch = await DataBatch.findById(batchId).lean();
  if (!batch) {
    const error = new Error('Data batch not found');
    error.statusCode = 404;
    throw error;
  }
  return batch;
}
