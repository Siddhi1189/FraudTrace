import mongoose from 'mongoose';

const fraudRingSchema = new mongoose.Schema(
  {
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      required: true,
      index: true,
    },
    // Deterministic logical identity of the ring derived from canonical member entities
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // PLACEHOLDER(FT-15): Stable human-readable RING-001 format
    label: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISSOLVED'],
      default: 'ACTIVE',
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
    totalFlow: {
      type: Number,
      default: 0,
    },
    transactionCount: {
      type: Number,
      default: 0,
    },
    patterns: {
      type: [String],
      default: [],
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const FraudRing = mongoose.model('FraudRing', fraudRingSchema);
