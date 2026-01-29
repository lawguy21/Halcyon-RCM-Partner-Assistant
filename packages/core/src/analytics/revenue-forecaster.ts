/**
 * Revenue Forecaster
 *
 * Predictive analytics engine for revenue forecasting and cash flow projection.
 * Includes seasonality analysis, scenario modeling, and confidence intervals.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Date range for forecasting
 */
export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Forecast filters
 */
export interface ForecastFilters {
  /** Payer types to include */
  payerTypes?: string[];
  /** Service types to include */
  serviceTypes?: string[];
  /** Specific payer IDs */
  payerIds?: string[];
  /** Organization ID */
  organizationId?: string;
  /** Include only claims in specific status */
  claimStatuses?: string[];
}

/**
 * Historical data point for seasonality calculation
 */
export interface HistoricalDataPoint {
  /** Period date (first day of period) */
  date: Date | string;
  /** Period type (day, week, month) */
  periodType: 'DAY' | 'WEEK' | 'MONTH';
  /** Total claims */
  claimCount: number;
  /** Total charges */
  chargedAmount: number;
  /** Total paid */
  paidAmount: number;
  /** Collection rate (paid/charged) */
  collectionRate: number;
  /** Average days to payment */
  averageDaysToPay: number;
}

/**
 * Revenue forecast result
 */
export interface RevenueForecast {
  /** Forecast period */
  dateRange: DateRange;
  /** Forecast by period */
  periods: ForecastPeriod[];
  /** Summary totals */
  summary: ForecastSummary;
  /** Confidence level (0-100) */
  confidence: number;
  /** Assumptions used */
  assumptions: ForecastAssumption[];
  /** Risk factors that could affect forecast */
  riskFactors: string[];
  /** Opportunities that could improve forecast */
  opportunities: string[];
  /** Generated at */
  generatedAt: Date;
}

/**
 * Single forecast period
 */
export interface ForecastPeriod {
  /** Period start date */
  startDate: Date;
  /** Period end date */
  endDate: Date;
  /** Period label (e.g., "January 2024") */
  label: string;
  /** Forecasted revenue */
  forecast: number;
  /** Lower bound (confidence interval) */
  lowerBound: number;
  /** Upper bound (confidence interval) */
  upperBound: number;
  /** Confidence level for this period */
  periodConfidence: number;
  /** Seasonality factor applied */
  seasonalityFactor: number;
  /** Expected claim count */
  expectedClaimCount: number;
  /** Expected collection rate */
  expectedCollectionRate: number;
}

/**
 * Forecast summary
 */
export interface ForecastSummary {
  /** Total forecasted revenue */
  totalForecast: number;
  /** Lower bound */
  totalLowerBound: number;
  /** Upper bound */
  totalUpperBound: number;
  /** Average monthly forecast */
  averageMonthly: number;
  /** Compared to historical average */
  vsHistoricalAverage: number;
  /** Trend direction */
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  /** Trend percentage change */
  trendPercent: number;
}

/**
 * Forecast assumption
 */
export interface ForecastAssumption {
  /** Assumption name */
  name: string;
  /** Assumption value */
  value: string | number;
  /** Impact on forecast */
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Is this assumption configurable */
  configurable: boolean;
}

/**
 * Seasonality pattern
 */
export interface SeasonalityPattern {
  /** Month (1-12) */
  month: number;
  /** Day of week (0-6, 0=Sunday) if applicable */
  dayOfWeek?: number;
  /** Seasonality factor (1.0 = average, >1 = above average) */
  factor: number;
  /** Historical average for this period */
  historicalAverage: number;
  /** Sample count used to calculate */
  sampleCount: number;
  /** Confidence in this pattern */
  confidence: number;
}

/**
 * Seasonality analysis result
 */
export interface SeasonalityAnalysis {
  /** Monthly patterns */
  monthlyPatterns: SeasonalityPattern[];
  /** Day-of-week patterns (if enough data) */
  dayOfWeekPatterns?: SeasonalityPattern[];
  /** Peak months */
  peakMonths: number[];
  /** Low months */
  lowMonths: number[];
  /** Annual cycle strength (0-100) */
  cycleStrength: number;
  /** Overall confidence in patterns */
  confidence: number;
}

/**
 * Cash flow projection input
 */
export interface CashFlowAccount {
  /** Account ID */
  accountId: string;
  /** Current balance */
  balance: number;
  /** Days past due */
  daysPastDue: number;
  /** Collection likelihood (0-100) */
  collectionLikelihood: number;
  /** Expected days to payment */
  expectedDaysToPayment: number | null;
  /** Expected collection amount */
  expectedCollection: number;
}

/**
 * Cash flow projection result
 */
export interface CashFlowProjection {
  /** Projection period */
  dateRange: DateRange;
  /** Weekly cash flow */
  weeklyProjections: WeeklyCashFlow[];
  /** Summary */
  summary: CashFlowSummary;
  /** Cumulative cash flow by week */
  cumulativeCashFlow: number[];
}

/**
 * Weekly cash flow
 */
export interface WeeklyCashFlow {
  /** Week start date */
  weekStart: Date;
  /** Week end date */
  weekEnd: Date;
  /** Week number */
  weekNumber: number;
  /** Expected collections */
  expectedCollections: number;
  /** Lower bound */
  lowerBound: number;
  /** Upper bound */
  upperBound: number;
  /** Number of accounts expected to pay */
  expectedPayingAccounts: number;
  /** Cumulative to date */
  cumulativeTotal: number;
}

/**
 * Cash flow summary
 */
export interface CashFlowSummary {
  /** Total expected collections */
  totalExpected: number;
  /** Total lower bound */
  totalLowerBound: number;
  /** Total upper bound */
  totalUpperBound: number;
  /** Average weekly collection */
  averageWeekly: number;
  /** Peak week */
  peakWeek: number;
  /** Peak week amount */
  peakWeekAmount: number;
  /** Total accounts included */
  totalAccounts: number;
  /** Total balance included */
  totalBalance: number;
}

/**
 * Scenario analysis input
 */
export interface ScenarioAssumption {
  /** Assumption name */
  name: string;
  /** Type of assumption */
  type: 'COLLECTION_RATE' | 'CLAIM_VOLUME' | 'PAYER_MIX' | 'DENIAL_RATE' | 'CUSTOM';
  /** Base value (current) */
  baseValue: number;
  /** Scenario value */
  scenarioValue: number;
  /** Unit (percentage, count, etc.) */
  unit: 'PERCENT' | 'COUNT' | 'CURRENCY';
}

/**
 * Scenario analysis result
 */
export interface ScenarioAnalysis {
  /** Scenario name */
  scenarioName: string;
  /** Assumptions used */
  assumptions: ScenarioAssumption[];
  /** Base case forecast */
  baseCaseForecast: number;
  /** Scenario forecast */
  scenarioForecast: number;
  /** Difference */
  difference: number;
  /** Percentage change */
  percentageChange: number;
  /** Impact classification */
  impact: 'SIGNIFICANT_POSITIVE' | 'POSITIVE' | 'MINIMAL' | 'NEGATIVE' | 'SIGNIFICANT_NEGATIVE';
  /** Sensitivity analysis - which assumptions have biggest impact */
  sensitivityAnalysis: Array<{
    assumption: string;
    impactPerUnit: number;
    elasticity: number;
  }>;
}

// ============================================================================
// MOCK HISTORICAL DATA (for initial forecasts)
// ============================================================================

/**
 * Default seasonality factors by month (healthcare-specific patterns)
 */
const DEFAULT_MONTHLY_SEASONALITY: Record<number, number> = {
  1: 1.15,  // January - high (deductibles reset)
  2: 1.05,  // February
  3: 1.02,  // March
  4: 0.98,  // April
  5: 0.95,  // May
  6: 0.90,  // June - low (summer)
  7: 0.85,  // July - lowest (summer)
  8: 0.88,  // August
  9: 0.95,  // September
  10: 1.00, // October
  11: 1.05, // November
  12: 1.10, // December - high (end of year)
};

/**
 * Default collection rate assumptions
 */
const DEFAULT_COLLECTION_RATES: Record<string, number> = {
  'MEDICARE': 0.92,
  'MEDICAID': 0.85,
  'COMMERCIAL': 0.88,
  'SELF_PAY': 0.35,
  'DEFAULT': 0.80,
};

// ============================================================================
// MODEL STATE
// ============================================================================

interface ForecastModelState {
  monthlySeasonality: Map<number, number>;
  collectionRates: Map<string, number>;
  historicalAverageMonthly: number;
  lastCalculatedAt: Date | null;
}

const modelState: ForecastModelState = {
  monthlySeasonality: new Map(Object.entries(DEFAULT_MONTHLY_SEASONALITY).map(([k, v]) => [parseInt(k), v])),
  collectionRates: new Map(Object.entries(DEFAULT_COLLECTION_RATES)),
  historicalAverageMonthly: 0,
  lastCalculatedAt: null,
};

// ============================================================================
// FORECAST FUNCTIONS
// ============================================================================

/**
 * Forecast revenue for a date range
 */
export function forecastRevenue(
  dateRange: DateRange,
  baseMonthlyRevenue: number,
  _filters?: ForecastFilters
): RevenueForecast {
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);

  // Generate periods (monthly)
  const periods: ForecastPeriod[] = [];
  let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);

  while (currentDate <= end) {
    const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const month = currentDate.getMonth() + 1;

    // Get seasonality factor
    const seasonalityFactor = modelState.monthlySeasonality.get(month) || 1.0;

    // Calculate days in period that overlap with requested range
    const effectiveStart = currentDate < start ? start : currentDate;
    const effectiveEnd = periodEnd > end ? end : periodEnd;
    const daysInPeriod = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDaysInMonth = periodEnd.getDate();
    const periodFraction = daysInPeriod / totalDaysInMonth;

    // Calculate forecast with seasonality
    const baseForecast = baseMonthlyRevenue * seasonalityFactor * periodFraction;

    // Apply confidence interval (wider for further out periods)
    const monthsOut = periods.length;
    const uncertaintyFactor = 1 + (monthsOut * 0.02);
    const lowerBound = baseForecast * (0.9 / uncertaintyFactor);
    const upperBound = baseForecast * (1.1 * uncertaintyFactor);
    const periodConfidence = Math.max(60, 95 - (monthsOut * 3));

    // Estimate claim metrics
    const averageChargePerClaim = 500; // Default assumption
    const expectedClaimCount = Math.round(baseForecast / (averageChargePerClaim * 0.85));
    const expectedCollectionRate = 0.85;

    periods.push({
      startDate: new Date(effectiveStart),
      endDate: new Date(effectiveEnd),
      label: formatPeriodLabel(currentDate),
      forecast: Math.round(baseForecast),
      lowerBound: Math.round(lowerBound),
      upperBound: Math.round(upperBound),
      periodConfidence,
      seasonalityFactor,
      expectedClaimCount,
      expectedCollectionRate,
    });

    // Move to next month
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  // Calculate summary
  const totalForecast = periods.reduce((sum, p) => sum + p.forecast, 0);
  const totalLowerBound = periods.reduce((sum, p) => sum + p.lowerBound, 0);
  const totalUpperBound = periods.reduce((sum, p) => sum + p.upperBound, 0);
  const averageMonthly = periods.length > 0 ? totalForecast / periods.length : 0;

  // Determine trend
  let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
  let trendPercent = 0;
  if (periods.length >= 3) {
    const firstHalf = periods.slice(0, Math.floor(periods.length / 2));
    const secondHalf = periods.slice(Math.floor(periods.length / 2));
    const firstHalfAvg = firstHalf.reduce((s, p) => s + p.forecast, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((s, p) => s + p.forecast, 0) / secondHalf.length;
    trendPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    if (trendPercent > 5) trend = 'INCREASING';
    else if (trendPercent < -5) trend = 'DECREASING';
  }

  // Build assumptions
  const assumptions: ForecastAssumption[] = [
    {
      name: 'Base Monthly Revenue',
      value: baseMonthlyRevenue,
      impact: 'HIGH',
      configurable: true,
    },
    {
      name: 'Seasonality Applied',
      value: 'Yes - Healthcare Standard',
      impact: 'MEDIUM',
      configurable: true,
    },
    {
      name: 'Collection Rate',
      value: '85%',
      impact: 'HIGH',
      configurable: true,
    },
    {
      name: 'Growth Rate',
      value: '0%',
      impact: 'MEDIUM',
      configurable: true,
    },
  ];

  // Identify risk factors
  const riskFactors: string[] = [];
  if (periods.some(p => p.seasonalityFactor < 0.9)) {
    riskFactors.push('Forecast includes historically low-revenue months');
  }
  if (periods.length > 6) {
    riskFactors.push('Long-range forecasts have higher uncertainty');
  }
  riskFactors.push('Payer contract changes could impact rates');
  riskFactors.push('Denial rate increases could reduce collections');

  // Identify opportunities
  const opportunities: string[] = [];
  if (periods.some(p => p.seasonalityFactor > 1.05)) {
    opportunities.push('Forecast includes historically high-revenue months');
  }
  opportunities.push('Improved clean claim rate could increase revenue');
  opportunities.push('Reduced denial rate could increase collections');

  // Calculate overall confidence
  const confidence = Math.round(periods.reduce((sum, p) => sum + p.periodConfidence, 0) / periods.length);

  return {
    dateRange,
    periods,
    summary: {
      totalForecast,
      totalLowerBound,
      totalUpperBound,
      averageMonthly: Math.round(averageMonthly),
      vsHistoricalAverage: modelState.historicalAverageMonthly > 0
        ? ((averageMonthly - modelState.historicalAverageMonthly) / modelState.historicalAverageMonthly) * 100
        : 0,
      trend,
      trendPercent: Math.round(trendPercent * 10) / 10,
    },
    confidence,
    assumptions,
    riskFactors,
    opportunities,
    generatedAt: new Date(),
  };
}

/**
 * Format period label
 */
function formatPeriodLabel(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Calculate seasonality patterns from historical data
 */
export function calculateSeasonality(historicalData: HistoricalDataPoint[]): SeasonalityAnalysis {
  // Group data by month
  const monthlyData: Map<number, number[]> = new Map();

  for (const point of historicalData) {
    const date = new Date(point.date);
    const month = date.getMonth() + 1;
    const values = monthlyData.get(month) || [];
    values.push(point.paidAmount);
    monthlyData.set(month, values);
  }

  // Calculate overall average
  const allValues = historicalData.map(d => d.paidAmount);
  const overallAverage = allValues.length > 0
    ? allValues.reduce((a, b) => a + b, 0) / allValues.length
    : 0;

  // Update model state
  modelState.historicalAverageMonthly = overallAverage;

  // Calculate monthly patterns
  const monthlyPatterns: SeasonalityPattern[] = [];
  let maxFactor = 0;
  let minFactor = 2;
  const peakMonths: number[] = [];
  const lowMonths: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const values = monthlyData.get(month) || [];
    const monthAverage = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : overallAverage;
    const factor = overallAverage > 0 ? monthAverage / overallAverage : 1.0;

    // Update model state
    modelState.monthlySeasonality.set(month, factor);

    if (factor > maxFactor) maxFactor = factor;
    if (factor < minFactor) minFactor = factor;

    monthlyPatterns.push({
      month,
      factor: Math.round(factor * 100) / 100,
      historicalAverage: Math.round(monthAverage),
      sampleCount: values.length,
      confidence: Math.min(95, 50 + values.length * 5),
    });
  }

  // Identify peak and low months
  for (const pattern of monthlyPatterns) {
    if (pattern.factor >= maxFactor * 0.95) peakMonths.push(pattern.month);
    if (pattern.factor <= minFactor * 1.05) lowMonths.push(pattern.month);
  }

  // Calculate cycle strength
  const cycleStrength = Math.round((maxFactor - minFactor) * 100);

  // Calculate confidence
  const totalSamples = historicalData.length;
  const confidence = Math.min(95, 50 + Math.log10(totalSamples + 1) * 20);

  modelState.lastCalculatedAt = new Date();

  return {
    monthlyPatterns,
    peakMonths,
    lowMonths,
    cycleStrength,
    confidence: Math.round(confidence),
  };
}

/**
 * Project cash flow from accounts receivable
 */
export function projectCashFlow(
  accounts: CashFlowAccount[],
  dateRange: DateRange
): CashFlowProjection {
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);

  // Calculate number of weeks
  const weeksInRange = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Group accounts by expected payment week
  const weeklyBuckets: Map<number, CashFlowAccount[]> = new Map();
  const today = new Date();

  for (const account of accounts) {
    if (!account.expectedDaysToPayment || account.collectionLikelihood < 10) {
      continue; // Skip accounts unlikely to pay in timeframe
    }

    const expectedPaymentDate = new Date(today.getTime() + account.expectedDaysToPayment * 24 * 60 * 60 * 1000);

    if (expectedPaymentDate >= start && expectedPaymentDate <= end) {
      const weekNumber = Math.floor((expectedPaymentDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const bucket = weeklyBuckets.get(weekNumber) || [];
      bucket.push(account);
      weeklyBuckets.set(weekNumber, bucket);
    }
  }

  // Generate weekly projections
  const weeklyProjections: WeeklyCashFlow[] = [];
  let cumulativeTotal = 0;
  let peakWeek = 1;
  let peakWeekAmount = 0;

  for (let week = 1; week <= weeksInRange; week++) {
    const weekStart = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(Math.min(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000, end.getTime()));

    const weekAccounts = weeklyBuckets.get(week) || [];
    const expectedCollections = weekAccounts.reduce((sum, a) => sum + a.expectedCollection, 0);

    // Calculate confidence interval (wider for further weeks)
    const uncertaintyFactor = 1 + (week * 0.03);
    const lowerBound = expectedCollections * (0.75 / uncertaintyFactor);
    const upperBound = expectedCollections * (1.2 * uncertaintyFactor);

    cumulativeTotal += expectedCollections;

    if (expectedCollections > peakWeekAmount) {
      peakWeek = week;
      peakWeekAmount = expectedCollections;
    }

    weeklyProjections.push({
      weekStart,
      weekEnd,
      weekNumber: week,
      expectedCollections: Math.round(expectedCollections),
      lowerBound: Math.round(lowerBound),
      upperBound: Math.round(upperBound),
      expectedPayingAccounts: weekAccounts.length,
      cumulativeTotal: Math.round(cumulativeTotal),
    });
  }

  // Calculate summary
  const totalExpected = weeklyProjections.reduce((sum, w) => sum + w.expectedCollections, 0);
  const totalLowerBound = weeklyProjections.reduce((sum, w) => sum + w.lowerBound, 0);
  const totalUpperBound = weeklyProjections.reduce((sum, w) => sum + w.upperBound, 0);
  const averageWeekly = weeklyProjections.length > 0 ? totalExpected / weeklyProjections.length : 0;

  return {
    dateRange,
    weeklyProjections,
    summary: {
      totalExpected: Math.round(totalExpected),
      totalLowerBound: Math.round(totalLowerBound),
      totalUpperBound: Math.round(totalUpperBound),
      averageWeekly: Math.round(averageWeekly),
      peakWeek,
      peakWeekAmount: Math.round(peakWeekAmount),
      totalAccounts: accounts.length,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    },
    cumulativeCashFlow: weeklyProjections.map(w => w.cumulativeTotal),
  };
}

/**
 * Perform scenario analysis
 */
export function scenarioAnalysis(
  baseForecast: number,
  assumptions: ScenarioAssumption[]
): ScenarioAnalysis {
  // Calculate scenario forecast by applying all assumption changes
  let scenarioForecast = baseForecast;
  const sensitivityAnalysis: Array<{
    assumption: string;
    impactPerUnit: number;
    elasticity: number;
  }> = [];

  for (const assumption of assumptions) {
    const changePercent = ((assumption.scenarioValue - assumption.baseValue) / assumption.baseValue);
    let impactMultiplier = 1;

    // Different assumption types have different impacts
    switch (assumption.type) {
      case 'COLLECTION_RATE':
        impactMultiplier = changePercent; // Direct impact
        break;
      case 'CLAIM_VOLUME':
        impactMultiplier = changePercent * 0.9; // Slightly less than proportional
        break;
      case 'PAYER_MIX':
        impactMultiplier = changePercent * 0.5; // Moderate impact
        break;
      case 'DENIAL_RATE':
        // Denial rate increase is negative impact
        impactMultiplier = -changePercent * 0.8;
        break;
      case 'CUSTOM':
        impactMultiplier = changePercent * 0.7;
        break;
    }

    const impact = baseForecast * impactMultiplier;
    scenarioForecast += impact;

    // Calculate sensitivity
    const unitChange = assumption.unit === 'PERCENT' ? 0.01 : 1;
    const impactPerUnit = impact / ((assumption.scenarioValue - assumption.baseValue) / unitChange);
    const elasticity = Math.abs(impactMultiplier / changePercent);

    sensitivityAnalysis.push({
      assumption: assumption.name,
      impactPerUnit: Math.round(impactPerUnit),
      elasticity: Math.round(elasticity * 100) / 100,
    });
  }

  // Calculate difference and percentage change
  const difference = scenarioForecast - baseForecast;
  const percentageChange = (difference / baseForecast) * 100;

  // Determine impact classification
  let impact: ScenarioAnalysis['impact'];
  if (percentageChange > 10) impact = 'SIGNIFICANT_POSITIVE';
  else if (percentageChange > 3) impact = 'POSITIVE';
  else if (percentageChange < -10) impact = 'SIGNIFICANT_NEGATIVE';
  else if (percentageChange < -3) impact = 'NEGATIVE';
  else impact = 'MINIMAL';

  // Sort sensitivity by absolute impact
  sensitivityAnalysis.sort((a, b) => Math.abs(b.impactPerUnit) - Math.abs(a.impactPerUnit));

  return {
    scenarioName: assumptions.length === 1 && assumptions[0] ? assumptions[0].name : 'Combined Scenario',
    assumptions,
    baseCaseForecast: Math.round(baseForecast),
    scenarioForecast: Math.round(scenarioForecast),
    difference: Math.round(difference),
    percentageChange: Math.round(percentageChange * 10) / 10,
    impact,
    sensitivityAnalysis,
  };
}

/**
 * Create common scenario assumptions
 */
export function createCommonScenarios(baseValues: {
  collectionRate: number;
  claimVolume: number;
  denialRate: number;
}): Record<string, ScenarioAssumption[]> {
  return {
    optimistic: [
      {
        name: 'Collection Rate',
        type: 'COLLECTION_RATE',
        baseValue: baseValues.collectionRate,
        scenarioValue: baseValues.collectionRate * 1.05,
        unit: 'PERCENT',
      },
      {
        name: 'Denial Rate',
        type: 'DENIAL_RATE',
        baseValue: baseValues.denialRate,
        scenarioValue: baseValues.denialRate * 0.85,
        unit: 'PERCENT',
      },
    ],
    pessimistic: [
      {
        name: 'Collection Rate',
        type: 'COLLECTION_RATE',
        baseValue: baseValues.collectionRate,
        scenarioValue: baseValues.collectionRate * 0.92,
        unit: 'PERCENT',
      },
      {
        name: 'Denial Rate',
        type: 'DENIAL_RATE',
        baseValue: baseValues.denialRate,
        scenarioValue: baseValues.denialRate * 1.2,
        unit: 'PERCENT',
      },
    ],
    volumeGrowth: [
      {
        name: 'Claim Volume',
        type: 'CLAIM_VOLUME',
        baseValue: baseValues.claimVolume,
        scenarioValue: baseValues.claimVolume * 1.1,
        unit: 'COUNT',
      },
    ],
    volumeDecline: [
      {
        name: 'Claim Volume',
        type: 'CLAIM_VOLUME',
        baseValue: baseValues.claimVolume,
        scenarioValue: baseValues.claimVolume * 0.9,
        unit: 'COUNT',
      },
    ],
  };
}

/**
 * Get model statistics
 */
export function getForecastModelStats(): {
  monthlySeasonalityFactors: Record<number, number>;
  collectionRates: Record<string, number>;
  historicalAverageMonthly: number;
  lastCalculatedAt: Date | null;
} {
  return {
    monthlySeasonalityFactors: Object.fromEntries(modelState.monthlySeasonality),
    collectionRates: Object.fromEntries(modelState.collectionRates),
    historicalAverageMonthly: modelState.historicalAverageMonthly,
    lastCalculatedAt: modelState.lastCalculatedAt,
  };
}
