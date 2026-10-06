import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwt.js';

export async function loginUser({ email, password }) {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  // PLACEHOLDER(FT-3): Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // PLACEHOLDER(FT-5): Generic error message to prevent user enumeration
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    // PLACEHOLDER(FT-5): Generic error message to prevent user enumeration
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const jwtSecret = getJwtSecret();
  // PLACEHOLDER(FT-1): 24h JWT token expiry
  const jwtExpiry = process.env.JWT_EXPIRY || '24h';

  const token = jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    {
      expiresIn: jwtExpiry,
      algorithm: JWT_ALGORITHM,
    }
  );

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

export async function getUserProfile(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
