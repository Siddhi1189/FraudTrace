import mongoose from 'mongoose';

const accountRiskSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      required: true,
      index: true,
    },
    // PLACEHOLDER(FT-12): 0-100 score
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    contributors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ruleVersion: {
      type: String,
      required: true,
    },
    whyFlagged: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

accountRiskSchema.index({ accountId: 1, analysisRunId: 1 }, { unique: true });

export const AccountRisk = mongoose.model('AccountRisk', accountRiskSchema);
