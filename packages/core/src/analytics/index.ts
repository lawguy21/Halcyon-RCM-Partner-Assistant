/**
 * Predictive Analytics Module
 *
 * Comprehensive analytics engine for Revenue Cycle Management including:
 * - Denial prediction and prevention
 * - Collection likelihood scoring
 * - Revenue forecasting
 * - KPI calculation and benchmarking
 */

// Denial Predictor
export {
  predictDenialRisk,
  getDenialReasons,
  getPreventionActions,
  trainModel as trainDenialModel,
  batchPredictDenialRisk,
  getModelStats as getDenialModelStats,
} from './denial-predictor.js';

export type {
  DenialRiskFactors,
  ClaimForPrediction,
  DenialPrediction,
  DenialReason,
  PreventionAction,
  RiskBreakdown,
  DenialCategory,
  HistoricalClaimData,
} from './denial-predictor.js';

// Collection Predictor
export {
  predictCollectionLikelihood,
  predictTimeToCollection,
  getOptimalStrategy,
  segmentAccounts,
  batchPredictCollection,
} from './collection-predictor.js';

export type {
  CollectionFactors,
  AccountForPrediction,
  CollectionPrediction,
  CollectionStrategy as PredictorCollectionStrategy,
  CollectionScoreBreakdown,
  AccountSegment,
  SegmentationResult,
} from './collection-predictor.js';

// Revenue Forecaster
export {
  forecastRevenue,
  calculateSeasonality,
  projectCashFlow,
  scenarioAnalysis,
  createCommonScenarios,
  getForecastModelStats,
} from './revenue-forecaster.js';

export type {
  DateRange,
  ForecastFilters,
  HistoricalDataPoint,
  RevenueForecast,
  ForecastPeriod,
  ForecastSummary,
  ForecastAssumption,
  SeasonalityPattern,
  SeasonalityAnalysis,
  CashFlowAccount,
  CashFlowProjection,
  WeeklyCashFlow,
  CashFlowSummary,
  ScenarioAssumption,
  ScenarioAnalysis,
} from './revenue-forecaster.js';

// KPI Calculator
export {
  calculateDaysInAR,
  calculateCleanClaimRate,
  calculateDenialRate,
  calculateCollectionRate,
  calculateFirstPassYield,
  calculateCostToCollect,
  calculateNetCollectionRate,
  calculateAdjustedCollectionRate,
  calculateAverageDaysToPayment,
  calculateDenialOverturnRate,
  generateKPIDashboard,
  getIndustryBenchmarks,
} from './kpi-calculator.js';

export type {
  ClaimForKPI,
  AccountForKPI,
  KPIResult,
  KPITrend,
  BenchmarkData,
  KPIDashboard,
  CostData,
} from './kpi-calculator.js';
