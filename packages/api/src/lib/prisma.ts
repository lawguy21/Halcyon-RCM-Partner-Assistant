/**
 * Prisma Client Singleton
 * Ensures a single instance of Prisma Client across the application
 *
 * For Prisma 7+, connection configuration is done via prisma.config.ts
 * and adapter is passed to PrismaClient constructor
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
 *
 * Note: For Prisma 7+, the database URL is configured in prisma.config.ts
 * For production with adapters (e.g., pg, @prisma/adapter-pg), you'll need to
 * configure the adapter and pass it to PrismaClient constructor.
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
