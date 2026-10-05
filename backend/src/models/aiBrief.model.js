import mongoose from 'mongoose';

// PLACEHOLDER(FT-21): AIBrief kind enum values
export const AI_BRIEF_KINDS = ['INVESTIGATION_BRIEF', 'CASE_QA'];

// PLACEHOLDER(FT-22): AIBrief verificationStatus enum values
export const AI_VERIFICATION_STATUSES = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'FALLBACK'];

// PLACEHOLDER(FT-25): Analyst decision enum values
export const ANALYST_DECISIONS = ['PENDING', 'ACCEPTED', 'EDITED', 'DISCARDED'];

const aiBriefSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: AI_BRIEF_KINDS,
      default: 'INVESTIGATION_BRIEF',
      required: true,
      index: true,
    },
    question: {
      type: String,
      default: null,
    },
    evidenceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    evidenceHash: {
      type: String,
      required: true,
      index: true,
    },
    structuredOutput: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: AI_VERIFICATION_STATUSES,
      required: true,
      index: true,
    },
    verificationErrors: {
      type: [String],
      default: [],
    },
    model: {
      type: String,
      required: true,
    },
    promptVersion: {
      type: String,
      required: true,
      default: 'v1.0.0',
    },
    analystDecision: {
      type: String,
      enum: ANALYST_DECISIONS,
      default: 'PENDING',
      index: true,
    },
    editedText: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Schema explicitly manages createdAt per documented schema
  }
);

export const AIBrief = mongoose.model('AIBrief', aiBriefSchema);
