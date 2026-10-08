import dotenv from 'dotenv';
// Load dotenv with override: true in development so .env wins over existing env vars (0.b)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ override: true });
} else {
  dotenv.config();
}

import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { initSocketIO } from './socket/index.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import dataRoutes from './routes/data.routes.js';
import graphRoutes from './routes/graph.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import alertRoutes from './routes/alert.routes.js';
import ringRoutes from './routes/ring.routes.js';
import accountRoutes from './routes/account.routes.js';
import caseRoutes from './routes/case.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { getJwtSecret } from './config/jwt.js';
import { corsOriginDelegate } from './config/cors.js';

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize Socket.IO
const io = initSocketIO(server);

// Middleware
app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
  })
);
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'FraudTrace API',
    status: 'online',
    version: '1.0.0',
    health: '/api/health',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/rings', ringRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', healthRoutes);
app.use('/', healthRoutes);

// Error Handling
app.use(errorHandler);

// Handle clean startup failures and graceful shutdown
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`);
  } else {
    console.error(`[Server] Server error: ${err.message}`);
  }
  process.exit(1);
});

async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  try {
    if (io) {
      io.close();
    }
  } catch (_) {}

  server.close(async () => {
    try {
      await mongoose.disconnect();
      console.log('[Server] Closed HTTP server and MongoDB connection.');
    } catch (_) {}
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start Server
async function startServer() {
  try {
    // Fail fast with clear error messages if MongoDB URI or JWT secret is missing in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MONGODB_URI) {
        throw new Error('FATAL: MONGODB_URI environment variable is missing in production environment');
      }
      if (!process.env.JWT_SECRET) {
        throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment');
      }
    }

    // BE-AUTH-2: Validate JWT_SECRET on boot (throws in production if missing)
    getJwtSecret();
    await connectDB();
    server.listen(PORT, () => {
      console.log(`[Server] FraudTrace backend with Socket.IO running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Server] Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();

export { app, server };
