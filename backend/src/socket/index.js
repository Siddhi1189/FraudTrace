import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwt.js';
import { corsOriginDelegate } from '../config/cors.js';

let ioInstance = null;

export function initSocketIO(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: corsOriginDelegate,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  // BE-AUTH-1: Authenticate Socket.IO handshake with JWT
  ioInstance.use((socket, next) => {
    const authHeader = socket.handshake.headers?.authorization;
    let token = socket.handshake.auth?.token;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

// Emits events strictly conforming to Section 9:
// analysis-started, analysis-progress, analysis-completed,
// alert-created, alert-updated, case-updated, ai-completed.
export function emitSocketEvent(eventName, payload) {
  if (ioInstance) {
    ioInstance.emit(eventName, payload);
  }
}
