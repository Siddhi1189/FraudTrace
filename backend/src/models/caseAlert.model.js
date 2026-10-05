import mongoose from 'mongoose';

const caseAlertSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attachment of the same alert to the same case
caseAlertSchema.index({ caseId: 1, alertId: 1 }, { unique: true });

export const CaseAlert = mongoose.model('CaseAlert', caseAlertSchema);
