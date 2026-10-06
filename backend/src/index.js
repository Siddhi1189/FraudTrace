import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initSocketIO(server);

// PLACEHOLDER(FT-26): CORS origins
function getAllowedOrigins() {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : [];
}

const allowedOrigins = getAllowedOrigins();

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Routes
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

// Error Handling
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
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
