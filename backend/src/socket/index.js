import { Server } from 'socket.io';

let ioInstance = null;

export function initSocketIO(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
    },
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
