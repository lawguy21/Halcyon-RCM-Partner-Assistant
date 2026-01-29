/**
 * KPI Calculator
 *
 * Revenue Cycle Management Key Performance Indicators calculation engine.
 * Includes trend analysis and industry benchmark comparison.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Claim data for KPI calculation
 */
export interface ClaimForKPI {
  /** Claim ID */
  claimId: string;
  /** Claim status */
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'PAID' | 'DENIED' | 'APPEALED';
  /** Billed amount */
  billedAmount: number;
  /** Allowed amount */
  allowedAmount?: number;
  /** Paid amount */
  paidAmount?: number;
  /** Patient responsibility */
  patientResponsibility?: number;
  /** Service date */
  serviceDate: Date | string;
  /** Submission date */
  submissionDate?: Date | string;
  /** Payment date */
  paymentDate?: Date | string;
  /** Denial date */
  denialDate?: Date | string;
  /** Was claim paid on first submission */
  paidFirstPass?: boolean;
  /** Was claim denied */
  wasDenied?: boolean;
  /** Was denial overturned */
  denialOverturned?: boolean;
  /** Payer type */
  payerType?: string;
}

/**
 * Account data for KPI calculation
 */
export interface AccountForKPI {
  /** Account ID */
  accountId: string;
  /** Original balance */
  originalBalance: number;
  /** Current balance */
  currentBalance: number;
  /** Total paid */
  totalPaid: number;
  /** Total adjustments */
  totalAdjustments: number;
  /** Account age in days */
  ageDays: number;
  /** Date of last payment */
  lastPaymentDate?: Date | string;
  /** Is account paid in full */
  isPaidInFull: boolean;
  /** Is account written off */
  isWrittenOff: boolean;
}

/**
 * KPI result with value and metadata
 */
export interface KPIResult<T = number> {
  /** KPI name */
  name: string;
  /** KPI value */
  value: T;
  /** Formatted value for display */
  displayValue: string;
  /** Unit of measurement */
  unit: string;
  /** Trend compared to prior period */
  trend?: KPITrend;
  /** Industry benchmark (if available) */
  benchmark?: BenchmarkData;
  /** Calculation notes */
  notes?: string;
  /** Sample size used in calculation */
  sampleSize: number;
}

/**
 * KPI trend data
 */
export interface KPITrend {
  /** Prior period value */
  priorValue: number;
  /** Change from prior period */
  change: number;
  /** Percentage change */
  changePercent: number;
  /** Trend direction */
  direction: 'UP' | 'DOWN' | 'STABLE';
  /** Is the trend favorable */
  favorable: boolean;
}

/**
 * Benchmark comparison data
 */
export interface BenchmarkData {
  /** Benchmark value */
  value: number;
  /** Source of benchmark */
  source: string;
  /** Performance vs benchmark */
  performance: 'ABOVE' | 'AT' | 'BELOW';
  /** Percentile ranking */
  percentile?: number;
}

/**
 * KPI Dashboard summary
 */
export interface KPIDashboard {
  /** Days in A/R */
  daysInAR: KPIResult;
  /** Clean claim rate */
  cleanClaimRate: KPIResult;
  /** Denial rate */
  denialRate: KPIResult;
  /** Collection rate */
  collectionRate: KPIResult;
  /** First pass yield */
  firstPassYield: KPIResult;
  /** Cost to collect */
  costToCollect: KPIResult;
  /** Net collection rate */
  netCollectionRate: KPIResult;
  /** Adjusted collection rate */
  adjustedCollectionRate: KPIResult;
  /** Average days to payment */
  averageDaysToPayment: KPIResult;
  /** Dashboard generation timestamp */
  generatedAt: Date;
  /** Period covered */
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Revenue and cost data for cost calculations
 */
export interface CostData {
  /** Total revenue collected */
  totalRevenue: number;
  /** Total collection costs */
  totalCosts: number;
  /** Staff costs */
  staffCosts?: number;
  /** Technology costs */
  technologyCosts?: number;
  /** Outsourcing costs */
  outsourcingCosts?: number;
  /** Other costs */
  otherCosts?: number;
}

// ============================================================================
// INDUSTRY BENCHMARKS
// ============================================================================

/**
 * Industry benchmark values (Healthcare Financial Management Association standards)
 */
const INDUSTRY_BENCHMARKS = {
  daysInAR: {
    excellent: 30,
    good: 40,
    average: 50,
    poor: 60,
    source: 'HFMA',
  },
  cleanClaimRate: {
    excellent: 98,
    good: 95,
    average: 90,
    poor: 85,
    source: 'HFMA',
  },
  denialRate: {
    excellent: 3,
    good: 5,
    average: 8,
    poor: 12,
    source: 'HFMA/MGMA',
  },
  collectionRate: {
    excellent: 98,
    good: 95,
    average: 92,
    poor: 88,
    source: 'MGMA',
  },
  firstPassYield: {
    excellent: 95,
    good: 90,
    average: 85,
    poor: 80,
    source: 'HFMA',
  },
  costToCollect: {
    excellent: 3,
    good: 4,
    average: 5,
    poor: 7,
    source: 'MGMA',
  },
  netCollectionRate: {
    excellent: 96,
    good: 94,
    average: 92,
    poor: 88,
    source: 'MGMA',
  },
  averageDaysToPayment: {
    excellent: 25,
    good: 35,
    average: 45,
    poor: 60,
    source: 'HFMA',
  },
};

// ============================================================================
// KPI CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Days in A/R (Accounts Receivable)
 * Formula: (Total A/R Balance / Average Daily Charges)
 */
export function calculateDaysInAR(
  claims: ClaimForKPI[],
  periodDays: number = 30,
  priorPeriodValue?: number
): KPIResult {
  const pendingClaims = claims.filter(c =>
    c.status !== 'PAID' && c.status !== 'DENIED'
  );

  const totalARBalance = pendingClaims.reduce((sum, c) =>
    sum + c.billedAmount - (c.paidAmount || 0), 0
  );

  const totalCharges = claims.reduce((sum, c) => sum + c.billedAmount, 0);
  const averageDailyCharges = totalCharges / periodDays;

  const daysInAR = averageDailyCharges > 0
    ? Math.round(totalARBalance / averageDailyCharges)
    : 0;

  return {
    name: 'Days in A/R',
    value: daysInAR,
    displayValue: `${daysInAR} days`,
    unit: 'days',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(daysInAR, priorPeriodValue, false)
      : undefined,
    benchmark: calculateBenchmark(daysInAR, INDUSTRY_BENCHMARKS.daysInAR, false),
    sampleSize: claims.length,
  };
}

/**
 * Calculate Clean Claim Rate
 * Formula: (Claims Paid on First Submission / Total Claims Submitted) x 100
 */
export function calculateCleanClaimRate(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const submittedClaims = claims.filter(c =>
    c.status !== 'DRAFT' && c.submissionDate
  );

  if (submittedClaims.length === 0) {
    return {
      name: 'Clean Claim Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No submitted claims in period',
    };
  }

  const cleanClaims = submittedClaims.filter(c =>
    c.paidFirstPass === true || (c.status === 'PAID' && !c.wasDenied)
  );

  const cleanClaimRate = Math.round((cleanClaims.length / submittedClaims.length) * 100);

  return {
    name: 'Clean Claim Rate',
    value: cleanClaimRate,
    displayValue: `${cleanClaimRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(cleanClaimRate, priorPeriodValue, true)
      : undefined,
    benchmark: calculateBenchmark(cleanClaimRate, INDUSTRY_BENCHMARKS.cleanClaimRate, true),
    sampleSize: submittedClaims.length,
  };
}

/**
 * Calculate Denial Rate
 * Formula: (Denied Claims / Total Claims) x 100
 */
export function calculateDenialRate(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const processedClaims = claims.filter(c =>
    c.status === 'PAID' || c.status === 'DENIED' || c.wasDenied
  );

  if (processedClaims.length === 0) {
    return {
      name: 'Denial Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No processed claims in period',
    };
  }

  const deniedClaims = processedClaims.filter(c =>
    c.status === 'DENIED' || c.wasDenied === true
  );

  const denialRate = Math.round((deniedClaims.length / processedClaims.length) * 100 * 10) / 10;

  return {
    name: 'Denial Rate',
    value: denialRate,
    displayValue: `${denialRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(denialRate, priorPeriodValue, false)
      : undefined,
    benchmark: calculateBenchmark(denialRate, INDUSTRY_BENCHMARKS.denialRate, false),
    sampleSize: processedClaims.length,
  };
}

/**
 * Calculate Collection Rate (Gross)
 * Formula: (Total Collected / Total Billed) x 100
 */
export function calculateCollectionRate(
  accounts: AccountForKPI[],
  priorPeriodValue?: number
): KPIResult {
  if (accounts.length === 0) {
    return {
      name: 'Collection Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No accounts in period',
    };
  }

  const totalBilled = accounts.reduce((sum, a) => sum + a.originalBalance, 0);
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0);

  const collectionRate = totalBilled > 0
    ? Math.round((totalCollected / totalBilled) * 100 * 10) / 10
    : 0;

  return {
    name: 'Collection Rate',
    value: collectionRate,
    displayValue: `${collectionRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(collectionRate, priorPeriodValue, true)
      : undefined,
    benchmark: calculateBenchmark(collectionRate, INDUSTRY_BENCHMARKS.collectionRate, true),
    sampleSize: accounts.length,
    notes: `Total Billed: $${totalBilled.toLocaleString()}, Collected: $${totalCollected.toLocaleString()}`,
  };
}

/**
 * Calculate First Pass Yield (Revenue-based)
 * Formula: (Revenue Collected on First Submission / Total Net Revenue) x 100
 */
export function calculateFirstPassYield(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const processedClaims = claims.filter(c => c.status === 'PAID');

  if (processedClaims.length === 0) {
    return {
      name: 'First Pass Yield',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No paid claims in period',
    };
  }

  const totalPaid = processedClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const firstPassPaid = processedClaims
    .filter(c => c.paidFirstPass === true || !c.wasDenied)
    .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

  const firstPassYield = totalPaid > 0
    ? Math.round((firstPassPaid / totalPaid) * 100)
    : 0;

  return {
    name: 'First Pass Yield',
    value: firstPassYield,
    displayValue: `${firstPassYield}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(firstPassYield, priorPeriodValue, true)
      : undefined,
    benchmark: calculateBenchmark(firstPassYield, INDUSTRY_BENCHMARKS.firstPassYield, true),
    sampleSize: processedClaims.length,
  };
}

/**
 * Calculate Cost to Collect
 * Formula: (Total Collection Costs / Total Revenue Collected) x 100
 */
export function calculateCostToCollect(
  revenue: number,
  costs: CostData,
  priorPeriodValue?: number
): KPIResult {
  if (revenue === 0) {
    return {
      name: 'Cost to Collect',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No revenue in period',
    };
  }

  const totalCosts = costs.totalCosts;
  const costToCollect = Math.round((totalCosts / revenue) * 100 * 100) / 100;

  let costBreakdown = '';
  if (costs.staffCosts) costBreakdown += `Staff: $${costs.staffCosts.toLocaleString()}; `;
  if (costs.technologyCosts) costBreakdown += `Tech: $${costs.technologyCosts.toLocaleString()}; `;
  if (costs.outsourcingCosts) costBreakdown += `Outsource: $${costs.outsourcingCosts.toLocaleString()}; `;

  return {
    name: 'Cost to Collect',
    value: costToCollect,
    displayValue: `${costToCollect}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(costToCollect, priorPeriodValue, false)
      : undefined,
    benchmark: calculateBenchmark(costToCollect, INDUSTRY_BENCHMARKS.costToCollect, false),
    sampleSize: 1,
    notes: costBreakdown || undefined,
  };
}

/**
 * Calculate Net Collection Rate
 * Formula: (Payments / (Charges - Contractual Adjustments)) x 100
 */
export function calculateNetCollectionRate(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const paidClaims = claims.filter(c => c.status === 'PAID' && c.paidAmount);

  if (paidClaims.length === 0) {
    return {
      name: 'Net Collection Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No paid claims in period',
    };
  }

  const totalPayments = paidClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const totalAllowed = paidClaims.reduce((sum, c) =>
    sum + (c.allowedAmount || c.billedAmount), 0
  );

  const netCollectionRate = totalAllowed > 0
    ? Math.round((totalPayments / totalAllowed) * 100 * 10) / 10
    : 0;

  return {
    name: 'Net Collection Rate',
    value: netCollectionRate,
    displayValue: `${netCollectionRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(netCollectionRate, priorPeriodValue, true)
      : undefined,
    benchmark: calculateBenchmark(netCollectionRate, INDUSTRY_BENCHMARKS.netCollectionRate, true),
    sampleSize: paidClaims.length,
  };
}

/**
 * Calculate Adjusted Collection Rate
 * Formula: (Payments / (Charges - Contractual Adjustments - Bad Debt)) x 100
 */
export function calculateAdjustedCollectionRate(
  accounts: AccountForKPI[],
  priorPeriodValue?: number
): KPIResult {
  if (accounts.length === 0) {
    return {
      name: 'Adjusted Collection Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
    };
  }

  const totalOriginal = accounts.reduce((sum, a) => sum + a.originalBalance, 0);
  const totalAdjustments = accounts.reduce((sum, a) => sum + a.totalAdjustments, 0);
  const totalWriteOffs = accounts
    .filter(a => a.isWrittenOff)
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0);

  const adjustedBase = totalOriginal - totalAdjustments - totalWriteOffs;
  const adjustedCollectionRate = adjustedBase > 0
    ? Math.round((totalCollected / adjustedBase) * 100 * 10) / 10
    : 0;

  return {
    name: 'Adjusted Collection Rate',
    value: adjustedCollectionRate,
    displayValue: `${adjustedCollectionRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(adjustedCollectionRate, priorPeriodValue, true)
      : undefined,
    sampleSize: accounts.length,
  };
}

/**
 * Calculate Average Days to Payment
 * Formula: Average(Payment Date - Service Date)
 */
export function calculateAverageDaysToPayment(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const paidClaims = claims.filter(c =>
    c.status === 'PAID' && c.paymentDate && c.serviceDate
  );

  if (paidClaims.length === 0) {
    return {
      name: 'Average Days to Payment',
      value: 0,
      displayValue: '0 days',
      unit: 'days',
      sampleSize: 0,
      notes: 'No paid claims with dates in period',
    };
  }

  const totalDays = paidClaims.reduce((sum, c) => {
    const paymentDate = new Date(c.paymentDate!);
    const serviceDate = new Date(c.serviceDate);
    const days = Math.floor((paymentDate.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + Math.max(0, days);
  }, 0);

  const averageDays = Math.round(totalDays / paidClaims.length);

  return {
    name: 'Average Days to Payment',
    value: averageDays,
    displayValue: `${averageDays} days`,
    unit: 'days',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(averageDays, priorPeriodValue, false)
      : undefined,
    benchmark: calculateBenchmark(averageDays, INDUSTRY_BENCHMARKS.averageDaysToPayment, false),
    sampleSize: paidClaims.length,
  };
}

/**
 * Calculate Denial Overturn Rate
 * Formula: (Overturned Denials / Total Denials Appealed) x 100
 */
export function calculateDenialOverturnRate(
  claims: ClaimForKPI[],
  priorPeriodValue?: number
): KPIResult {
  const deniedClaims = claims.filter(c => c.wasDenied === true);
  const appealedClaims = claims.filter(c => c.status === 'APPEALED' || c.denialOverturned !== undefined);
  const overturnedClaims = claims.filter(c => c.denialOverturned === true);

  if (appealedClaims.length === 0) {
    return {
      name: 'Denial Overturn Rate',
      value: 0,
      displayValue: '0%',
      unit: '%',
      sampleSize: 0,
      notes: 'No appealed claims in period',
    };
  }

  const overturnRate = Math.round((overturnedClaims.length / appealedClaims.length) * 100);

  return {
    name: 'Denial Overturn Rate',
    value: overturnRate,
    displayValue: `${overturnRate}%`,
    unit: '%',
    trend: priorPeriodValue !== undefined
      ? calculateTrend(overturnRate, priorPeriodValue, true)
      : undefined,
    sampleSize: appealedClaims.length,
    notes: `${deniedClaims.length} total denials, ${appealedClaims.length} appealed, ${overturnedClaims.length} overturned`,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate trend from prior period
 */
function calculateTrend(
  currentValue: number,
  priorValue: number,
  higherIsBetter: boolean
): KPITrend {
  const change = currentValue - priorValue;
  const changePercent = priorValue !== 0
    ? Math.round((change / priorValue) * 100 * 10) / 10
    : 0;

  let direction: 'UP' | 'DOWN' | 'STABLE';
  if (Math.abs(changePercent) < 2) direction = 'STABLE';
  else if (change > 0) direction = 'UP';
  else direction = 'DOWN';

  const favorable = higherIsBetter
    ? direction === 'UP' || direction === 'STABLE'
    : direction === 'DOWN' || direction === 'STABLE';

  return {
    priorValue,
    change: Math.round(change * 10) / 10,
    changePercent,
    direction,
    favorable,
  };
}

/**
 * Calculate benchmark comparison
 */
function calculateBenchmark(
  value: number,
  benchmark: { excellent: number; good: number; average: number; poor: number; source: string },
  higherIsBetter: boolean
): BenchmarkData {
  const benchmarkValue = benchmark.average;

  let performance: 'ABOVE' | 'AT' | 'BELOW';
  let percentile: number;

  if (higherIsBetter) {
    if (value >= benchmark.excellent) {
      performance = 'ABOVE';
      percentile = 90;
    } else if (value >= benchmark.good) {
      performance = 'ABOVE';
      percentile = 75;
    } else if (value >= benchmark.average) {
      performance = 'AT';
      percentile = 50;
    } else if (value >= benchmark.poor) {
      performance = 'BELOW';
      percentile = 25;
    } else {
      performance = 'BELOW';
      percentile = 10;
    }
  } else {
    // For metrics where lower is better (e.g., denial rate, days in AR)
    if (value <= benchmark.excellent) {
      performance = 'ABOVE';
      percentile = 90;
    } else if (value <= benchmark.good) {
      performance = 'ABOVE';
      percentile = 75;
    } else if (value <= benchmark.average) {
      performance = 'AT';
      percentile = 50;
    } else if (value <= benchmark.poor) {
      performance = 'BELOW';
      percentile = 25;
    } else {
      performance = 'BELOW';
      percentile = 10;
    }
  }

  return {
    value: benchmarkValue,
    source: benchmark.source,
    performance,
    percentile,
  };
}

/**
 * Generate complete KPI dashboard
 */
export function generateKPIDashboard(
  claims: ClaimForKPI[],
  accounts: AccountForKPI[],
  costs: CostData,
  dateRange: { startDate: Date; endDate: Date },
  priorPeriodKPIs?: Partial<Record<string, number>>
): KPIDashboard {
  const periodDays = Math.ceil(
    (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const totalRevenue = accounts.reduce((sum, a) => sum + a.totalPaid, 0);

  return {
    daysInAR: calculateDaysInAR(claims, periodDays, priorPeriodKPIs?.daysInAR),
    cleanClaimRate: calculateCleanClaimRate(claims, priorPeriodKPIs?.cleanClaimRate),
    denialRate: calculateDenialRate(claims, priorPeriodKPIs?.denialRate),
    collectionRate: calculateCollectionRate(accounts, priorPeriodKPIs?.collectionRate),
    firstPassYield: calculateFirstPassYield(claims, priorPeriodKPIs?.firstPassYield),
    costToCollect: calculateCostToCollect(totalRevenue, costs, priorPeriodKPIs?.costToCollect),
    netCollectionRate: calculateNetCollectionRate(claims, priorPeriodKPIs?.netCollectionRate),
    adjustedCollectionRate: calculateAdjustedCollectionRate(accounts, priorPeriodKPIs?.adjustedCollectionRate),
    averageDaysToPayment: calculateAverageDaysToPayment(claims, priorPeriodKPIs?.averageDaysToPayment),
    generatedAt: new Date(),
    period: dateRange,
  };
}

/**
 * Get industry benchmarks
 */
export function getIndustryBenchmarks(): Record<string, {
  excellent: number;
  good: number;
  average: number;
  poor: number;
  unit: string;
  higherIsBetter: boolean;
  source: string;
}> {
  return {
    daysInAR: { ...INDUSTRY_BENCHMARKS.daysInAR, unit: 'days', higherIsBetter: false },
    cleanClaimRate: { ...INDUSTRY_BENCHMARKS.cleanClaimRate, unit: '%', higherIsBetter: true },
    denialRate: { ...INDUSTRY_BENCHMARKS.denialRate, unit: '%', higherIsBetter: false },
    collectionRate: { ...INDUSTRY_BENCHMARKS.collectionRate, unit: '%', higherIsBetter: true },
    firstPassYield: { ...INDUSTRY_BENCHMARKS.firstPassYield, unit: '%', higherIsBetter: true },
    costToCollect: { ...INDUSTRY_BENCHMARKS.costToCollect, unit: '%', higherIsBetter: false },
    netCollectionRate: { ...INDUSTRY_BENCHMARKS.netCollectionRate, unit: '%', higherIsBetter: true },
    averageDaysToPayment: { ...INDUSTRY_BENCHMARKS.averageDaysToPayment, unit: 'days', higherIsBetter: false },
  };
}
