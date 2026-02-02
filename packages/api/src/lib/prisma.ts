// @ts-nocheck
/**
 * Prisma Client Singleton
 * Ensures a single instance of Prisma Client across the application
 */

import { PrismaClient } from '@prisma/client';

// Declare global type for the Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create a singleton Prisma client
 * In development, we use a global variable to avoid multiple instances due to hot reloading
 */
const createPrismaClient = (): PrismaClient | null => {
  if (!process.env.DATABASE_URL) {
    console.warn('[Prisma] DATABASE_URL not set - database features will be unavailable');
    return null;
  }

  try {
    return new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  } catch (error) {
    console.error('[Prisma] Failed to create client:', error);
    return null;
  }
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
