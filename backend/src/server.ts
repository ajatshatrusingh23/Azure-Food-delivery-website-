import 'dotenv/config';
import http from 'http';

import { env } from '@config/env';
import { logger } from '@config/logger';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { initializeSocket } from '@config/socket';
import { registerSocketHandlers } from '@socket/socket.handler';
import createApp from './app';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const bootstrap = async (): Promise<void> => {
  // 1. Connect to database
  await connectDatabase();

  // 2. Create Express app
  const app = createApp();

  // 3. Create HTTP server
  const httpServer = http.createServer(app);

  // 4. Attach Socket.IO
  const io = initializeSocket(httpServer);
  registerSocketHandlers(io);

  // 5. Start listening
  httpServer.listen(env.port, () => {
    logger.info(`🚀 Server running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`📡 Socket.IO attached`);
    logger.info(`🔗 API: http://localhost:${env.port}/api/v1/health`);
  });

  // 6. Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully...`);

    httpServer.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      logger.info('Database disconnected');
      process.exit(0);
    });

    // Force exit after 10s if still hanging
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

void bootstrap();
