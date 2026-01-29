/**
 * Analytics Controller
 *
 * REST API endpoints for predictive analytics including denial prediction,
 * collection prioritization, revenue forecasting, and KPI tracking.
 */

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { AuthRequest } from '../middleware/auth.js';

// ============================================================================
// DENIAL PREDICTION
// ============================================================================

/**
 * POST /analytics/denial-prediction
 * Predict denial risk for a single claim
 */
export async function predictDenialRisk(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { claimId } = req.body;

    if (!claimId) {
      res.status(400).json({
        error: { message: 'claimId is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const prediction = await analyticsService.getDenialPrediction({
      claimId,
      organizationId: req.user?.organizationId,
    });

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /analytics/denial-prediction/batch
 * Batch predict denial risk for multiple claims
 */
export async function batchPredictDenialRisk(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { claimIds } = req.body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      res.status(400).json({
        error: { message: 'claimIds array is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (claimIds.length > 100) {
      res.status(400).json({
        error: { message: 'Maximum 100 claims per batch', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const predictions = await analyticsService.batchDenialPrediction({
      claimIds,
      organizationId: req.user?.organizationId,
    });

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /analytics/denial-prediction/train
 * Train denial prediction model with historical data
 */
export async function trainDenialModel(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await analyticsService.trainDenialPredictionModel(
      req.user?.organizationId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// COLLECTION PRIORITIZATION
// ============================================================================

/**
 * GET /analytics/collection-prioritization
 * Get prioritized collection list
 */
export async function getCollectionPrioritization(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { limit, minBalance, states } = req.query;

    const result = await analyticsService.getCollectionPrioritization({
      organizationId: req.user?.organizationId,
      limit: limit ? parseInt(limit as string, 10) : 100,
      minBalance: minBalance ? parseFloat(minBalance as string) : 25,
      states: states ? (states as string).split(',') : undefined,
    });

    res.json({
      success: true,
      data: {
        accounts: result.accounts,
        segmentation: result.segmentation,
      },
      count: result.accounts.length,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// REVENUE FORECASTING
// ============================================================================

/**
 * GET /analytics/revenue-forecast
 * Get revenue forecast
 */
export async function getRevenueForecast(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate, baseMonthlyRevenue, payerTypes, serviceTypes } = req.query;

    if (!startDate || !endDate || !baseMonthlyRevenue) {
      res.status(400).json({
        error: {
          message: 'startDate, endDate, and baseMonthlyRevenue are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const forecast = await analyticsService.getRevenueForecast({
      startDate: startDate as string,
      endDate: endDate as string,
      baseMonthlyRevenue: parseFloat(baseMonthlyRevenue as string),
      organizationId: req.user?.organizationId,
      filters: {
        payerTypes: payerTypes ? (payerTypes as string).split(',') : undefined,
        serviceTypes: serviceTypes ? (serviceTypes as string).split(',') : undefined,
      },
    });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /analytics/seasonality
 * Get historical seasonality patterns
 */
export async function getSeasonality(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { months } = req.query;

    const seasonality = await analyticsService.calculateHistoricalSeasonality(
      req.user?.organizationId,
      months ? parseInt(months as string, 10) : 24
    );

    res.json({
      success: true,
      data: seasonality,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /analytics/cash-flow-projection
 * Project cash flow from current A/R
 */
export async function getCashFlowProjection(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          message: 'startDate and endDate are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const projection = await analyticsService.projectCashFlowFromAR(
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      req.user?.organizationId
    );

    res.json({
      success: true,
      data: projection,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /analytics/scenario-analysis
 * Run what-if scenario analysis
 */
export async function runScenarioAnalysis(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { baseForecast, assumptions } = req.body;

    if (!baseForecast || !assumptions || !Array.isArray(assumptions)) {
      res.status(400).json({
        error: {
          message: 'baseForecast and assumptions array are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const analysis = await analyticsService.runScenarioAnalysis(
      baseForecast,
      assumptions
    );

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// KPI DASHBOARD
// ============================================================================

/**
 * GET /analytics/kpi-dashboard
 * Get KPI dashboard summary
 */
export async function getKPIDashboard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate, compareToPriorPeriod } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          message: 'startDate and endDate are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const dashboard = await analyticsService.getKPIDashboard({
      startDate: startDate as string,
      endDate: endDate as string,
      organizationId: req.user?.organizationId,
      compareToPriorPeriod: compareToPriorPeriod === 'true',
    });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /analytics/kpi/:name/trend
 * Get KPI trend over time
 */
export async function getKPITrend(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.params;
    const { startDate, endDate, granularity } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          message: 'startDate and endDate are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const validKPIs = [
      'daysInAR',
      'cleanClaimRate',
      'denialRate',
      'collectionRate',
      'firstPassYield',
      'costToCollect',
      'netCollectionRate',
      'averageDaysToPayment',
    ];

    if (!validKPIs.includes(name)) {
      res.status(400).json({
        error: {
          message: `Invalid KPI name. Valid options: ${validKPIs.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const trend = await analyticsService.getKPITrends({
      kpiName: name,
      startDate: startDate as string,
      endDate: endDate as string,
      organizationId: req.user?.organizationId,
      granularity: (granularity as 'DAY' | 'WEEK' | 'MONTH') || 'MONTH',
    });

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /analytics/benchmarks
 * Get industry benchmarks
 */
export async function getBenchmarks(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const benchmarks = analyticsService.getBenchmarks();

    res.json({
      success: true,
      data: benchmarks,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * POST /analytics/export
 * Export analytics data
 */
export async function exportAnalytics(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, startDate, endDate, format } = req.body;

    if (!type || !startDate || !endDate) {
      res.status(400).json({
        error: {
          message: 'type, startDate, and endDate are required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const validTypes = [
      'denial_predictions',
      'collection_prioritization',
      'kpi_dashboard',
      'revenue_forecast',
    ];

    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: {
          message: `Invalid export type. Valid options: ${validTypes.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = await analyticsService.exportAnalytics({
      type,
      startDate,
      endDate,
      organizationId: req.user?.organizationId,
      format: format || 'csv',
    });

    if (result.format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(result.data[0] || {});
      const csv = [
        headers.join(','),
        ...result.data.map((row: any) =>
          headers.map(h => {
            const val = row[h];
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`;
            }
            return val;
          }).join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: result.data,
        filename: result.filename,
      });
    }
  } catch (error) {
    next(error);
  }
}

// Export controller object
export const analyticsController = {
  predictDenialRisk,
  batchPredictDenialRisk,
  trainDenialModel,
  getCollectionPrioritization,
  getRevenueForecast,
  getSeasonality,
  getCashFlowProjection,
  runScenarioAnalysis,
  getKPIDashboard,
  getKPITrend,
  getBenchmarks,
  exportAnalytics,
};
