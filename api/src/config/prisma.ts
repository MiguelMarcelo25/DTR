import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

/**
 * Single PrismaClient instance per process. In dev with hot-reload (tsx watch)
 * we cache it on `globalThis` to avoid exhausting DB connections on every reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export default prisma;
