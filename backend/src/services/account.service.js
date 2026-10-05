import mongoose from 'mongoose';
import { Account } from '../models/account.model.js';
import { Transaction } from '../models/transaction.model.js';
import { AccountRisk } from '../models/accountRisk.model.js';
import { Alert } from '../models/alert.model.js';

export async function resolveAccount(identifier) {
  let account = null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    account = await Account.findById(identifier).lean();
  }
  if (!account) {
    account = await Account.findOne({ externalId: identifier }).lean();
  }
  return account;
}

export async function getAccountDetails(identifier) {
  const account = await resolveAccount(identifier);
  if (!account) {
    const error = new Error(`Account "${identifier}" not found`);
    error.statusCode = 404;
    throw error;
  }

  // Fetch latest risk assessment
  const latestRisk = await AccountRisk.findOne({ accountId: account._id })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch alerts mentioning this account's externalId
  const alerts = await Alert.find({
    'entities.accounts': account.externalId,
  })
    .populate('ringId', 'label score')
    .sort({ createdAt: -1 })
    .lean();

  return {
    account,
    latestRisk: latestRisk || {
      score: 0,
      whyFlagged: ['Baseline activity; no risk signals observed.'],
      contributors: [],
    },
    alerts,
    alertCount: alerts.length,
  };
}

export async function getAccountTransactions(identifier) {
  const account = await resolveAccount(identifier);
  if (!account) {
    const error = new Error(`Account "${identifier}" not found`);
    error.statusCode = 404;
    throw error;
  }

  const transactions = await Transaction.find({
    $or: [{ fromAccount: account._id }, { toAccount: account._id }],
  })
    .populate('fromAccount toAccount merchant device')
    .sort({ timestamp: -1 })
    .lean();

  return {
    account,
    transactions,
    count: transactions.length,
  };
}
