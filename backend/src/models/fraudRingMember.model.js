import mongoose from 'mongoose';

const fraudRingMemberSchema = new mongoose.Schema(
  {
    ringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FraudRing',
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['ACCOUNT', 'DEVICE', 'MERCHANT'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityTypeModel',
    },
  },
  {
    timestamps: false,
  }
);

fraudRingMemberSchema.virtual('entityTypeModel').get(function () {
  if (this.entityType === 'ACCOUNT') return 'Account';
  if (this.entityType === 'DEVICE') return 'Device';
  if (this.entityType === 'MERCHANT') return 'Merchant';
  return 'Account';
});

fraudRingMemberSchema.index({ ringId: 1, entityType: 1, entityId: 1 }, { unique: true });

export const FraudRingMember = mongoose.model('FraudRingMember', fraudRingMemberSchema);
