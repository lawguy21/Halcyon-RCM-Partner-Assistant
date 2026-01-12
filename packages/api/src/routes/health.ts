/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { VERSION } from '@halcyon-rcm/core';

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
