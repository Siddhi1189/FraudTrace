import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    pattern: {
      type: String,
      required: true,
      index: true,
    },
    // PLACEHOLDER(FT-11): severity enum
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    // PLACEHOLDER(FT-12): 0-100 score
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    triageStatus: {
      type: String,
      enum: ['NEW', 'REVIEWING', 'DISMISSED', 'ESCALATED'],
      default: 'NEW',
      index: true,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    ringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FraudRing',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Alert = mongoose.model('Alert', alertSchema);
