import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

/** Prisma 7 talks to Postgres through a driver adapter (node-postgres pool). */
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.databaseUrl }),
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

// Reuse one client across hot reloads in development (each client owns a connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createClient();
if (!env.isProduction) globalForPrisma.prisma = prisma;

export type Db = typeof prisma;
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const connectDatabase = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
