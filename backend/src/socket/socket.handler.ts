import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@config/logger';
import { verifyAccessToken } from '@utils/generateTokens';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@types/socket.types';

/**
 * Registers all Socket.IO connection/disconnection handlers and
 * attaches the JWT authentication guard on every incoming socket.
 */
export const registerSocketHandlers = (io: SocketIOServer): void => {
  // ── Authentication middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth['token'] as string | undefined ??
      socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      next(new Error('Authentication token missing'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data['user'] = payload;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => {
    const userId = (socket.data['user'] as { userId: string } | undefined)?.userId;

    logger.info(`Socket connected: ${socket.id} | User: ${userId ?? 'unknown'}`);

    // Auto-join personal room
    if (userId) {
      void socket.join(SOCKET_ROOMS.user(userId));
    }

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    socket.on(SOCKET_EVENTS.ERROR, (err: Error) => {
      logger.error(`Socket error [${socket.id}]: ${err.message}`);
    });
  });
};
