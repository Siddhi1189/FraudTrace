import { FraudRing } from '../models/fraudRing.model.js';
import { FraudRingMember } from '../models/fraudRingMember.model.js';
import { Alert } from '../models/alert.model.js';

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

  // Fetch populated members and alerts
  const [members, alerts] = await Promise.all([
    FraudRingMember.find({ ringId }).populate('entityId').lean(),
    Alert.find({ ringId }).lean(),
  ]);

  return {
    ...ring,
    members,
    memberCount: members.length,
    alerts,
    alertCount: alerts.length,
  };
}
