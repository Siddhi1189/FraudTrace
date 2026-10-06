import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: MONGODB_URI environment variable is missing in production environment');
    }
  }
  const resolvedUri = mongoUri || 'mongodb://127.0.0.1:27017/fraudtrace';
  try {
    const conn = await mongoose.connect(resolvedUri);
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database] Connection error: ${error.message}`);
    throw error;
  }
}

export function getDBStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
