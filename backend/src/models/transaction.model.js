import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    externalTransactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DataBatch',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Rule: Each transaction has exactly one destination, either toAccount or merchant.
transactionSchema.pre('validate', function (next) {
  const hasToAccount = !!this.toAccount;
  const hasMerchant = !!this.merchant;

  if ((hasToAccount && hasMerchant) || (!hasToAccount && !hasMerchant)) {
    this.invalidate(
      'destination',
      'Transaction must have exactly one destination: either toAccount or merchant.'
    );
  }
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
