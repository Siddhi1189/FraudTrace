import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // PLACEHOLDER(FT-3): Normalize email to lower case to prevent case mismatch
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ANALYST', 'ADMIN'],
      required: true,
      default: 'ANALYST',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
