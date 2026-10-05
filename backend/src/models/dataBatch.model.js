import mongoose from 'mongoose';

const dataBatchSchema = new mongoose.Schema(
  {
    // PLACEHOLDER(FT-7): source enum allowed values
    source: {
      type: String,
      enum: ['CSV_UPLOAD', 'SIMULATION'],
      required: true,
    },
    seed: {
      type: Number,
      default: null,
    },
    totalRows: {
      type: Number,
      required: true,
      default: 0,
    },
    acceptedRows: {
      type: Number,
      required: true,
      default: 0,
    },
    rejectedRows: {
      type: Number,
      required: true,
      default: 0,
    },
    duplicateRows: {
      type: Number,
      required: true,
      default: 0,
    },
    errors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    suppressReservedKeysWarning: true,
  }
);

export const DataBatch = mongoose.model('DataBatch', dataBatchSchema);
