import mongoose from 'mongoose';

const analysisRunSchema = new mongoose.Schema(
  {
    // PLACEHOLDER(FT-14): status enum
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    ruleVersion: {
      type: String,
      required: true,
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    summary: {
      totalAlerts: { type: Number, default: 0 },
      totalRings: { type: Number, default: 0 },
      highRiskAccounts: { type: Number, default: 0 },
      stageMs: { type: mongoose.Schema.Types.Mixed, default: {} },
      breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    error: {
      type: String,
      default: null,
    },
    // PLACEHOLDER(FT-14): trigger enum
    trigger: {
      type: String,
      enum: ['MANUAL', 'SCHEDULED', 'DATA_INGEST'],
      default: 'MANUAL',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AnalysisRun = mongoose.model('AnalysisRun', analysisRunSchema);
