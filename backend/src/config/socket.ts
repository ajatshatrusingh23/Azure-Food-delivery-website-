import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './env';
import { logger } from './logger';
import type { ISocketService } from '@interfaces/socket.interface';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

export const getSocketServer = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initializeSocket first.');
  }
  return io;
};

export const createSocketService = (socketServer: SocketIOServer): ISocketService => ({
  emit: (room, event, data) => {
    socketServer.to(room).emit(event, data);
  },
  joinRoom: (socketId, room) => {
    const socket = socketServer.sockets.sockets.get(socketId);
    if (socket) {
      void socket.join(room);
    }
  },
  leaveRoom: (socketId, room) => {
    const socket = socketServer.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(room);
    }
  },
  broadcastToAll: (event, data) => {
    socketServer.emit(event, data);
  },
});
