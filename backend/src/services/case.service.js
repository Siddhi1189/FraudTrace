import { Case, CASE_STATUSES, CASE_DISPOSITIONS } from '../models/case.model.js';
import { CaseAlert } from '../models/caseAlert.model.js';
import { CaseNote } from '../models/caseNote.model.js';
import { CaseEvent } from '../models/caseEvent.model.js';
import { Alert } from '../models/alert.model.js';
import { AIBrief } from '../models/aiBrief.model.js';

// PLACEHOLDER(FT-18): Sequential case number generation with fallback
export async function generateCaseNumber() {
  const latestCase = await Case.findOne({ caseNumber: /^FT-\d+$/ })
    .sort({ createdAt: -1, caseNumber: -1 })
    .select('caseNumber')
    .lean();

  if (!latestCase || !latestCase.caseNumber) {
    return 'FT-1001';
  }

  const match = latestCase.caseNumber.match(/^FT-(\d+)$/);
  if (!match) {
    const totalCount = await Case.countDocuments();
    return `FT-${1001 + totalCount}`;
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `FT-${nextNumber}`;
}

export async function createCase({ title, initialAlertId, userId }) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    const error = new Error('Case title is required');
    error.status = 400;
    throw error;
  }

  let caseNumber;
  let attempts = 0;
  let newCase = null;

  // Retry on rare caseNumber collision
  while (attempts < 5 && !newCase) {
    try {
      caseNumber = await generateCaseNumber();
      newCase = await Case.create({
        caseNumber,
        title: title.trim(),
        status: 'OPEN',
        disposition: null,
        createdBy: userId,
        closedAt: null,
      });
    } catch (err) {
      if (err.code === 11000) {
        attempts++;
      } else {
        throw err;
      }
    }
  }

  if (!newCase) {
    const fallbackNumber = `FT-${Date.now().toString().slice(-4)}`;
    newCase = await Case.create({
      caseNumber: fallbackNumber,
      title: title.trim(),
      status: 'OPEN',
      disposition: null,
      createdBy: userId,
      closedAt: null,
    });
  }

  // Audit event: CASE_CREATED
  await CaseEvent.create({
    caseId: newCase._id,
    eventType: 'CASE_CREATED',
    metadata: {
      caseNumber: newCase.caseNumber,
      title: newCase.title,
      status: newCase.status,
    },
    createdBy: userId,
    createdAt: new Date(),
  });

  // If initial alert provided, attach it
  if (initialAlertId) {
    const alert = await Alert.findById(initialAlertId);
    if (alert) {
      await CaseAlert.create({
        caseId: newCase._id,
        alertId: alert._id,
      });

      // Audit event: ALERT_ATTACHED
      await CaseEvent.create({
        caseId: newCase._id,
        eventType: 'ALERT_ATTACHED',
        metadata: {
          alertId: alert._id,
          pattern: alert.pattern,
          severity: alert.severity,
          score: alert.score,
        },
        createdBy: userId,
        createdAt: new Date(),
      });
    }
  }

  return newCase;
}

export async function getCases({ status, disposition }) {
  const query = {};
  if (status) query.status = status;
  if (disposition) query.disposition = disposition;

  const cases = await Case.find(query)
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate alert counts per case
  const caseIds = cases.map((c) => c._id);
  const alertCounts = await CaseAlert.aggregate([
    { $match: { caseId: { $in: caseIds } } },
    { $group: { _id: '$caseId', count: { $sum: 1 } } },
  ]);

  const countMap = {};
  alertCounts.forEach((ac) => {
    countMap[ac._id.toString()] = ac.count;
  });

  const enrichedCases = cases.map((c) => ({
    ...c,
    alertCount: countMap[c._id.toString()] || 0,
  }));

  return { cases: enrichedCases, count: enrichedCases.length };
}

export async function getCaseById(id) {
  const caseRecord = await Case.findById(id).populate('createdBy', 'name email role');
  if (!caseRecord) {
    const error = new Error(`Case not found: ${id}`);
    error.status = 404;
    throw error;
  }

  // Get attached alerts
  const caseAlerts = await CaseAlert.find({ caseId: id })
    .populate({
      path: 'alertId',
      populate: { path: 'ringId', select: 'label score status fingerprint' },
    })
    .sort({ createdAt: -1 })
    .lean();

  const alerts = caseAlerts
    .filter((ca) => ca.alertId)
    .map((ca) => ({
      ...ca.alertId,
      attachedAt: ca.createdAt,
    }));

  // Get notes
  const notes = await CaseNote.find({ caseId: id })
    .populate('authorId', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  // Get audit events
  const events = await CaseEvent.find({ caseId: id })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  // Get AI briefs
  const briefs = await AIBrief.find({ caseId: id })
    .sort({ createdAt: -1 })
    .lean();

  return {
    case: caseRecord,
    alerts,
    notes,
    events,
    briefs,
  };
}

// PLACEHOLDER(FT-20): Case status transition and disposition rules
export async function updateCase(id, { title, status, disposition }, userId) {
  const caseRecord = await Case.findById(id);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${id}`);
    error.status = 404;
    throw error;
  }

  const previousStatus = caseRecord.status;
  const previousDisposition = caseRecord.disposition;

  // Title update
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      const error = new Error('Case title cannot be empty');
      error.status = 400;
      throw error;
    }
    caseRecord.title = title.trim();
  }

  // Disposition validation
  if (disposition !== undefined) {
    if (disposition !== null && !CASE_DISPOSITIONS.includes(disposition)) {
      const error = new Error(`Invalid disposition: ${disposition}. Allowed: ${CASE_DISPOSITIONS.join(', ')}`);
      error.status = 400;
      throw error;
    }
  }

  // Status transition validation
  if (status !== undefined) {
    if (!CASE_STATUSES.includes(status)) {
      const error = new Error(`Invalid status: ${status}. Allowed: ${CASE_STATUSES.join(', ')}`);
      error.status = 400;
      throw error;
    }

    if (status !== previousStatus) {
      caseRecord.status = status;

      // Status change event
      await CaseEvent.create({
        caseId: caseRecord._id,
        eventType: 'STATUS_CHANGED',
        metadata: {
          from: previousStatus,
          to: status,
        },
        createdBy: userId,
        createdAt: new Date(),
      });

      if (status === 'CLOSED') {
        caseRecord.closedAt = new Date();
        const finalDisposition = disposition !== undefined ? disposition : caseRecord.disposition;
        caseRecord.disposition = finalDisposition;

        // Case closed event
        await CaseEvent.create({
          caseId: caseRecord._id,
          eventType: 'CASE_CLOSED',
          metadata: {
            closedAt: caseRecord.closedAt,
            disposition: finalDisposition,
          },
          createdBy: userId,
          createdAt: new Date(),
        });
      } else if (previousStatus === 'CLOSED') {
        // Reopening case
        caseRecord.closedAt = null;
      }
    }
  }

  // Handle disposition update if not already captured in closure
  if (disposition !== undefined && disposition !== previousDisposition && status !== 'CLOSED') {
    caseRecord.disposition = disposition;
    await CaseEvent.create({
      caseId: caseRecord._id,
      eventType: 'DISPOSITION_SET',
      metadata: {
        from: previousDisposition,
        to: disposition,
      },
      createdBy: userId,
      createdAt: new Date(),
    });
  }

  await caseRecord.save();
  return caseRecord;
}

export async function addCaseNote(caseId, content, userId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.status = 404;
    throw error;
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    const error = new Error('Note content is required');
    error.status = 400;
    throw error;
  }

  const note = await CaseNote.create({
    caseId,
    authorId: userId,
    content: content.trim(),
  });

  // Audit event: NOTE_ADDED
  await CaseEvent.create({
    caseId,
    eventType: 'NOTE_ADDED',
    metadata: {
      noteId: note._id,
      contentSnippet: note.content.slice(0, 100),
    },
    createdBy: userId,
    createdAt: new Date(),
  });

  await note.populate('authorId', 'name email role');
  return note;
}

export async function attachAlertToCase(caseId, alertId, userId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.status = 404;
    throw error;
  }

  const alert = await Alert.findById(alertId);
  if (!alert) {
    const error = new Error(`Alert not found: ${alertId}`);
    error.status = 404;
    throw error;
  }

  // Prevent duplicate attachment
  const existing = await CaseAlert.findOne({ caseId, alertId });
  if (existing) {
    const error = new Error(`Alert ${alertId} is already attached to this case`);
    error.status = 409;
    throw error;
  }

  const caseAlert = await CaseAlert.create({
    caseId,
    alertId,
  });

  // Audit event: ALERT_ATTACHED
  await CaseEvent.create({
    caseId,
    eventType: 'ALERT_ATTACHED',
    metadata: {
      alertId: alert._id,
      pattern: alert.pattern,
      severity: alert.severity,
      score: alert.score,
    },
    createdBy: userId,
    createdAt: new Date(),
  });

  return caseAlert;
}

export async function getCaseEvents(caseId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.status = 404;
    throw error;
  }

  const events = await CaseEvent.find({ caseId })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  return events;
}
