import http from 'http';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { startJobs } from './jobs';
import { createSocketServer } from '@socket/server';
import { createApp } from './app';

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  const httpServer = http.createServer(createApp());
  const io = createSocketServer(httpServer);
  const stopJobs = startJobs();

  httpServer.listen(env.port, () => {
    logger.info(`Azure API on http://localhost:${env.port}/api/v1 (${env.nodeEnv}, payments: ${env.payments.provider})`);
  });

  // Graceful shutdown: stop taking requests, let in-flight ones finish, then close the pool.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    stopJobs();
    io.close();
    httpServer.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { reason }));
};

bootstrap().catch((err) => {
  logger.error('Failed to start', err as Error);
  process.exit(1);
});
