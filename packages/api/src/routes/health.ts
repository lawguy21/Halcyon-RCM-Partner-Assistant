// @ts-nocheck
/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { VERSION } from '@halcyon-rcm/core';
import { prisma } from '../lib/prisma.js';
import { execSync } from 'child_process';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: VERSION,
  });
});

healthRouter.get('/ready', (_req: Request, res: Response) => {
  // Add readiness checks here (database, etc.)
  res.json({
    ready: true,
    checks: {
      database: 'ok',
      cache: 'ok',
    },
  });
});

healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({
    live: true,
  });
});

// Database diagnostic endpoint
healthRouter.get('/db-status', async (_req: Request, res: Response) => {
  const status: any = {
    timestamp: new Date().toISOString(),
    databaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
  };

  try {
    // Test raw database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    status.connectionTest = 'success';
    status.queryResult = result;
  } catch (error: any) {
    status.connectionTest = 'failed';
    status.connectionError = error.message;
  }

  try {
    // Check if User table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    status.tables = tables;
  } catch (error: any) {
    status.tableCheckError = error.message;
  }

  try {
    // Try to count users
    const userCount = await prisma.user.count();
    status.userCount = userCount;
  } catch (error: any) {
    status.userCountError = error.message;
  }

  res.json(status);
});

// Database migration endpoint - run prisma db push
healthRouter.post('/db-migrate', async (_req: Request, res: Response) => {
  try {
    const output = execSync('npx prisma db push --skip-generate --accept-data-loss', {
      encoding: 'utf-8',
      env: process.env,
      cwd: process.cwd(),
    });
    res.json({
      success: true,
      message: 'Database migration completed',
      output,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Database migration failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
    });
  }
});
