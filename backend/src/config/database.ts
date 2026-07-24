import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: env.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    if (env.isDevelopment) {
      // @ts-expect-error — Prisma event typing requires explicit event map
      prisma.$on('query', (e: { query: string; duration: number }) => {
        logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
      });
    }

    // @ts-expect-error — Prisma event typing requires explicit event map
    prisma.$on('error', (e: { message: string }) => {
      logger.error(`Database error: ${e.message}`);
    });
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database:', error);
    throw error;
  }
};
