/**
 * Halcyon RCM Partner Assistant - Job Queue Infrastructure
 *
 * PostgreSQL-based job queue using pg-boss.
 * No Redis required - uses the existing PostgreSQL database.
 */

import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

/**
 * Initialize the job queue
 * Must be called before using any queue functionality
 */
export async function initializeQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for job queue');
  }

  boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    console.error('PgBoss error:', error);
  });

  boss.on('monitor-states', (states) => {
    console.log('Queue states:', states);
  });

  await boss.start();
  console.log('Job queue started');

  return boss;
}

/**
 * Get the initialized queue instance
 * Throws if queue hasn't been initialized
 */
export function getQueue(): PgBoss {
  if (!boss) {
    throw new Error('Queue not initialized. Call initializeQueue() first.');
  }
  return boss;
}

/**
 * Stop the job queue gracefully
 */
export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30000 });
    boss = null;
    console.log('Job queue stopped');
  }
}

/**
 * Check if queue is initialized
 */
export function isQueueInitialized(): boolean {
  return boss !== null;
}

export { PgBoss };
export * from './jobs.js';
export * from './progressStore.js';
export * from './workers/index.js';
