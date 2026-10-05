import mongoose from 'mongoose';

// PLACEHOLDER(FT-20): Case status transition rules: OPEN, INVESTIGATING, CLOSED
export const CASE_STATUSES = ['OPEN', 'INVESTIGATING', 'CLOSED'];

export const CASE_DISPOSITIONS = ['CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'INCONCLUSIVE'];

const caseSchema = new mongoose.Schema(
  {
    // PLACEHOLDER(FT-18): Sequential case number format FT-XXXX
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: CASE_STATUSES,
      default: 'OPEN',
      required: true,
      index: true,
    },
    disposition: {
      type: String,
      enum: CASE_DISPOSITIONS,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Case = mongoose.model('Case', caseSchema);
