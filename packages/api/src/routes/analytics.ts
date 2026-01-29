/**
 * Analytics Routes
 *
 * REST API routes for predictive analytics including denial prediction,
 * collection prioritization, revenue forecasting, and KPI tracking.
 */

import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

export const analyticsRouter = Router();

// ============================================================================
// DENIAL PREDICTION ROUTES
// ============================================================================

/**
 * POST /analytics/denial-prediction
 * Predict denial risk for a single claim
 *
 * Request body:
 * - claimId: string (required)
 *
 * Response:
 * - prediction object with risk score, reasons, and actions
 */
analyticsRouter.post(
  '/denial-prediction',
  authenticateToken,
  analyticsController.predictDenialRisk
);

/**
 * POST /analytics/denial-prediction/batch
 * Batch predict denial risk for multiple claims (max 100)
 *
 * Request body:
 * - claimIds: string[] (required)
 *
 * Response:
 * - array of prediction objects
 */
analyticsRouter.post(
  '/denial-prediction/batch',
  authenticateToken,
  analyticsController.batchPredictDenialRisk
);

/**
 * POST /analytics/denial-prediction/train
 * Train the denial prediction model with historical data
 * Requires admin role
 *
 * Response:
 * - training results including sample count and pattern counts
 */
analyticsRouter.post(
  '/denial-prediction/train',
  authenticateToken,
  analyticsController.trainDenialModel
);

// ============================================================================
// COLLECTION PRIORITIZATION ROUTES
// ============================================================================

/**
 * GET /analytics/collection-prioritization
 * Get prioritized collection list with predictions
 *
 * Query parameters:
 * - limit: number (default: 100)
 * - minBalance: number (default: 25)
 * - states: comma-separated list of collection states
 *
 * Response:
 * - accounts: array of scored/prioritized accounts
 * - segmentation: accounts grouped by likelihood tier
 */
analyticsRouter.get(
  '/collection-prioritization',
  authenticateToken,
  analyticsController.getCollectionPrioritization
);

// ============================================================================
// REVENUE FORECASTING ROUTES
// ============================================================================

/**
 * GET /analytics/revenue-forecast
 * Get revenue forecast for date range
 *
 * Query parameters:
 * - startDate: string (required, ISO date)
 * - endDate: string (required, ISO date)
 * - baseMonthlyRevenue: number (required)
 * - payerTypes: comma-separated list (optional)
 * - serviceTypes: comma-separated list (optional)
 *
 * Response:
 * - forecast with periods, summary, confidence, and assumptions
 */
analyticsRouter.get(
  '/revenue-forecast',
  authenticateToken,
  analyticsController.getRevenueForecast
);

/**
 * GET /analytics/seasonality
 * Get historical seasonality patterns
 *
 * Query parameters:
 * - months: number (default: 24, how far back to analyze)
 *
 * Response:
 * - monthly and weekly seasonality patterns
 */
analyticsRouter.get(
  '/seasonality',
  authenticateToken,
  analyticsController.getSeasonality
);

/**
 * POST /analytics/cash-flow-projection
 * Project cash flow from current accounts receivable
 *
 * Request body:
 * - startDate: string (required)
 * - endDate: string (required)
 *
 * Response:
 * - weekly cash flow projections with confidence intervals
 */
analyticsRouter.post(
  '/cash-flow-projection',
  authenticateToken,
  analyticsController.getCashFlowProjection
);

/**
 * POST /analytics/scenario-analysis
 * Run what-if scenario analysis on revenue forecast
 *
 * Request body:
 * - baseForecast: number (required)
 * - assumptions: array of scenario assumptions (required)
 *
 * Response:
 * - scenario comparison with impact analysis
 */
analyticsRouter.post(
  '/scenario-analysis',
  authenticateToken,
  analyticsController.runScenarioAnalysis
);

// ============================================================================
// KPI DASHBOARD ROUTES
// ============================================================================

/**
 * GET /analytics/kpi-dashboard
 * Get comprehensive KPI dashboard
 *
 * Query parameters:
 * - startDate: string (required, ISO date)
 * - endDate: string (required, ISO date)
 * - compareToPriorPeriod: boolean (default: false)
 *
 * Response:
 * - KPI values with trends and benchmarks
 */
analyticsRouter.get(
  '/kpi-dashboard',
  authenticateToken,
  analyticsController.getKPIDashboard
);

/**
 * GET /analytics/kpi/:name/trend
 * Get trend data for a specific KPI
 *
 * URL parameters:
 * - name: KPI name (daysInAR, cleanClaimRate, denialRate, etc.)
 *
 * Query parameters:
 * - startDate: string (required)
 * - endDate: string (required)
 * - granularity: DAY | WEEK | MONTH (default: MONTH)
 *
 * Response:
 * - data points over time with trend analysis
 */
analyticsRouter.get(
  '/kpi/:name/trend',
  authenticateToken,
  analyticsController.getKPITrend
);

/**
 * GET /analytics/benchmarks
 * Get industry benchmarks for KPIs
 *
 * Response:
 * - benchmark values by KPI with sources
 */
analyticsRouter.get(
  '/benchmarks',
  optionalAuth,
  analyticsController.getBenchmarks
);

// ============================================================================
// EXPORT ROUTES
// ============================================================================

/**
 * POST /analytics/export
 * Export analytics data to CSV or JSON
 *
 * Request body:
 * - type: denial_predictions | collection_prioritization | kpi_dashboard | revenue_forecast
 * - startDate: string (required)
 * - endDate: string (required)
 * - format: csv | json (default: csv)
 *
 * Response:
 * - CSV file download or JSON data
 */
analyticsRouter.post(
  '/export',
  authenticateToken,
  analyticsController.exportAnalytics
);

export default analyticsRouter;
