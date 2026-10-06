import { FraudRing } from '../models/fraudRing.model.js';
import { FraudRingMember } from '../models/fraudRingMember.model.js';
import { Alert } from '../models/alert.model.js';
import { Account } from '../models/account.model.js';
import { Device } from '../models/device.model.js';
import { Merchant } from '../models/merchant.model.js';

export async function getRings(filter = {}) {
  const query = {};
  if (filter.status) {
    if (filter.status !== 'ALL') query.status = filter.status;
  } else {
    // Default to ACTIVE rings
    query.status = 'ACTIVE';
  }

  const rings = await FraudRing.find(query).sort({ score: -1, createdAt: -1 }).lean();

  // Attach member counts
  const ringIds = rings.map((r) => r._id);
  const members = await FraudRingMember.find({ ringId: { $in: ringIds } }).lean();

  const memberCountMap = new Map();
  members.forEach((m) => {
    const rId = m.ringId.toString();
    memberCountMap.set(rId, (memberCountMap.get(rId) || 0) + 1);
  });

  return rings.map((r) => ({
    ...r,
    memberCount: memberCountMap.get(r._id.toString()) || 0,
  }));
}

export async function getRingById(ringId) {
  const ring = await FraudRing.findById(ringId).lean();
  if (!ring) {
    const error = new Error('Fraud ring not found');
    error.statusCode = 404;
    throw error;
  }

  // Fetch members and alerts
  const [memberRecords, alerts] = await Promise.all([
    FraudRingMember.find({ ringId }).lean(),
    Alert.find({ ringId }).lean(),
  ]);

  // Manually resolve member entities per entityType (A2)
  const accountIds = memberRecords.filter((m) => m.entityType === 'ACCOUNT').map((m) => m.entityId);
  const deviceIds = memberRecords.filter((m) => m.entityType === 'DEVICE').map((m) => m.entityId);
  const merchantIds = memberRecords.filter((m) => m.entityType === 'MERCHANT').map((m) => m.entityId);

  const [accounts, devices, merchants] = await Promise.all([
    Account.find({ _id: { $in: accountIds } }).lean(),
    Device.find({ _id: { $in: deviceIds } }).lean(),
    Merchant.find({ _id: { $in: merchantIds } }).lean(),
  ]);

  const entityMap = new Map();
  accounts.forEach((a) => entityMap.set(a._id.toString(), a));
  devices.forEach((d) => entityMap.set(d._id.toString(), d));
  merchants.forEach((m) => entityMap.set(m._id.toString(), m));

  const members = memberRecords.map((m) => ({
    ...m,
    entityId: entityMap.get(m.entityId.toString()) || m.entityId,
  }));

  return {
    ...ring,
    members,
    memberCount: members.length,
    alerts,
    alertCount: alerts.length,
  };
}
