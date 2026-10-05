import mongoose from 'mongoose';

// PLACEHOLDER(FT-19): CaseEvent audit trail event types
export const CASE_EVENT_TYPES = [
  'CASE_CREATED',
  'ALERT_ATTACHED',
  'NOTE_ADDED',
  'STATUS_CHANGED',
  'DISPOSITION_SET',
  'CASE_CLOSED',
  'AI_BRIEF_GENERATED',
  'AI_BRIEF_EDITED',
  'AI_BRIEF_DECIDED',
  'AI_QUESTION_ASKED',
];

const caseEventSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: CASE_EVENT_TYPES,
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

export const CaseEvent = mongoose.model('CaseEvent', caseEventSchema);
