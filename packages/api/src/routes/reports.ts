/**
 * Reports Routes
 * Routes for analytics and reporting
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reportController } from '../controllers/reportController.js';

export const reportsRouter = Router();

// Validation schemas
const filtersSchema = z.object({
  primaryRecoveryPath: z.string().optional(),
  minConfidence: z.coerce.number().optional(),
  maxConfidence: z.coerce.number().optional(),
  state: z.string().optional(),
  encounterType: z.string().optional(),
  minRecovery: z.coerce.number().optional(),
  maxRecovery: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tags: z.string().optional(),
});

const trendOptionsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: z.enum(['day', 'week', 'month']).optional(),
  // Include filter options
  primaryRecoveryPath: z.string().optional(),
  state: z.string().optional(),
  encounterType: z.string().optional(),
});

/**
 * GET /reports/summary
 * Get overall recovery opportunity summary
 */
reportsRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = filtersSchema.parse(req.query);

    // Parse tags if provided
    const filters = {
      ...parsed,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()) : undefined,
    };

    const summary = await reportController.getSummary(filters);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /reports/by-pathway
 * Get breakdown by recovery pathway
 */
reportsRouter.get('/by-pathway', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = filtersSchema.parse(req.query);

    const filters = {
      ...parsed,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()) : undefined,
    };

    const report = await reportController.getByPathway(filters);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /reports/by-state
 * Get breakdown by state program
 */
reportsRouter.get('/by-state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = filtersSchema.parse(req.query);

    const filters = {
      ...parsed,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()) : undefined,
    };

    const report = await reportController.getByState(filters);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /reports/by-urgency
 * Get breakdown by urgency level
 */
reportsRouter.get('/by-urgency', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = filtersSchema.parse(req.query);

    const filters = {
      ...parsed,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()) : undefined,
    };

    const report = await reportController.getByUrgency(filters);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /reports/trends
 * Get recovery trends over time
 */
reportsRouter.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = trendOptionsSchema.parse(req.query);

    const options = {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      granularity: parsed.granularity,
      filters: {
        primaryRecoveryPath: parsed.primaryRecoveryPath,
        state: parsed.state,
        encounterType: parsed.encounterType,
      },
    };

    const report = await reportController.getTrends(options);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /reports/quick-stats
 * Get quick statistics for dashboard
 */
reportsRouter.get('/quick-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get summary for quick stats
    const summary = await reportController.getSummary();

    res.json({
      success: true,
      data: {
        totalAssessments: summary.totalAssessments,
        totalRecoveryOpportunity: summary.totalRecoveryOpportunity,
        averageConfidence: summary.averageConfidence,
        conversionRate: summary.conversionRate,
        recentActivity: {
          last7Days: summary.recentTrend.last7Days,
          last30Days: summary.recentTrend.last30Days,
        },
        topPathway: summary.topPathways[0] || null,
        confidenceDistribution: {
          high: summary.byConfidenceTier.high.count,
          medium: summary.byConfidenceTier.medium.count,
          low: summary.byConfidenceTier.low.count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/comparison
 * Compare two time periods
 */
reportsRouter.get('/comparison', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      period1Start: z.string(),
      period1End: z.string(),
      period2Start: z.string(),
      period2End: z.string(),
    });

    const parsed = schema.parse(req.query);

    // Get reports for both periods
    const [period1, period2] = await Promise.all([
      reportController.getSummary({
        startDate: parsed.period1Start,
        endDate: parsed.period1End,
      }),
      reportController.getSummary({
        startDate: parsed.period2Start,
        endDate: parsed.period2End,
      }),
    ]);

    // Calculate changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      success: true,
      data: {
        period1: {
          dateRange: { start: parsed.period1Start, end: parsed.period1End },
          ...period1,
        },
        period2: {
          dateRange: { start: parsed.period2Start, end: parsed.period2End },
          ...period2,
        },
        changes: {
          assessmentCountChange: calculateChange(period2.totalAssessments, period1.totalAssessments),
          recoveryOpportunityChange: calculateChange(period2.totalRecoveryOpportunity, period1.totalRecoveryOpportunity),
          confidenceChange: period2.averageConfidence - period1.averageConfidence,
          conversionRateChange: period2.conversionRate - period1.conversionRate,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters. Required: period1Start, period1End, period2Start, period2End',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});
