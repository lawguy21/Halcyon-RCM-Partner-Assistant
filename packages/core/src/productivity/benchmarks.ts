/**
 * Performance Benchmarks Module
 *
 * Provides industry benchmarks for RCM staff productivity,
 * benchmark comparison functions, team ranking, and training need identification.
 */

import { TaskType } from './time-tracking.js';
import {
  type EfficiencyScoreResult,
  type MetricCountResult,
  type AverageHandleTimeResult,
  type AccuracyRateResult,
} from './metrics-calculator.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Staff roles with associated benchmark expectations
 */
export enum StaffRole {
  BILLER = 'BILLER',
  PAYMENT_POSTER = 'PAYMENT_POSTER',
  COLLECTOR = 'COLLECTOR',
  DENIAL_SPECIALIST = 'DENIAL_SPECIALIST',
  ELIGIBILITY_SPECIALIST = 'ELIGIBILITY_SPECIALIST',
  CODER = 'CODER',
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER',
}

/**
 * Benchmark metric types
 */
export enum BenchmarkMetric {
  CLAIMS_PER_HOUR = 'CLAIMS_PER_HOUR',
  ACCOUNTS_PER_DAY = 'ACCOUNTS_PER_DAY',
  PAYMENTS_PER_HOUR = 'PAYMENTS_PER_HOUR',
  DENIALS_PER_DAY = 'DENIALS_PER_DAY',
  CALLS_PER_HOUR = 'CALLS_PER_HOUR',
  ACCURACY_RATE = 'ACCURACY_RATE',
  HANDLE_TIME_SECONDS = 'HANDLE_TIME_SECONDS',
  COLLECTION_RATE = 'COLLECTION_RATE',
  DENIAL_OVERTURN_RATE = 'DENIAL_OVERTURN_RATE',
}

/**
 * Industry benchmark values by role
 */
export interface RoleBenchmarks {
  role: StaffRole;
  displayName: string;
  benchmarks: Record<BenchmarkMetric, BenchmarkValue>;
}

/**
 * Benchmark value with thresholds
 */
export interface BenchmarkValue {
  target: number;
  minimum: number;
  excellent: number;
  unit: string;
  description: string;
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparisonResult {
  userId: string;
  metric: BenchmarkMetric;
  actualValue: number;
  targetValue: number;
  minimumValue: number;
  excellentValue: number;
  percentOfTarget: number;
  rating: BenchmarkRating;
  gap: number;
  recommendation: string;
}

/**
 * Benchmark rating
 */
export type BenchmarkRating =
  | 'excellent'
  | 'above_target'
  | 'at_target'
  | 'below_target'
  | 'needs_improvement';

/**
 * Team ranking result
 */
export interface TeamRankingResult {
  userId: string;
  rank: number;
  totalUsers: number;
  percentile: number;
  value: number;
  metric: BenchmarkMetric;
}

/**
 * Top performer entry
 */
export interface TopPerformer {
  userId: string;
  userName?: string;
  rank: number;
  value: number;
  percentOfTarget: number;
  rating: BenchmarkRating;
}

/**
 * Leaderboard result
 */
export interface LeaderboardResult {
  metric: BenchmarkMetric;
  dateRange: { startDate: Date; endDate: Date };
  topPerformers: TopPerformer[];
  teamAverage: number;
  teamMedian: number;
}

/**
 * Training need identification result
 */
export interface TrainingNeedsResult {
  userId: string;
  role?: StaffRole;
  overallAssessment: TrainingAssessment;
  areas: TrainingArea[];
  recommendedTraining: TrainingRecommendation[];
  priorityScore: number; // 0-100, higher = more urgent
}

/**
 * Training assessment level
 */
export type TrainingAssessment =
  | 'proficient'
  | 'satisfactory'
  | 'needs_development'
  | 'urgent_attention';

/**
 * Training area with gap analysis
 */
export interface TrainingArea {
  taskType: TaskType;
  metric: BenchmarkMetric;
  currentPerformance: number;
  targetPerformance: number;
  gap: number;
  gapPercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend?: 'improving' | 'stable' | 'declining';
}

/**
 * Training recommendation
 */
export interface TrainingRecommendation {
  area: TaskType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDurationHours?: number;
  resources?: string[];
}

// ============================================================================
// INDUSTRY BENCHMARKS BY ROLE
// ============================================================================

export const ROLE_BENCHMARKS: Record<StaffRole, RoleBenchmarks> = {
  [StaffRole.BILLER]: {
    role: StaffRole.BILLER,
    displayName: 'Biller',
    benchmarks: {
      [BenchmarkMetric.CLAIMS_PER_HOUR]: {
        target: 15,
        minimum: 10,
        excellent: 25,
        unit: 'claims/hour',
        description: 'Number of claims submitted per hour',
      },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: {
        target: 50,
        minimum: 35,
        excellent: 75,
        unit: 'accounts/day',
        description: 'Number of accounts worked per day',
      },
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 95,
        minimum: 90,
        excellent: 99,
        unit: '%',
        description: 'Clean claim submission rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 240,
        minimum: 360,
        excellent: 180,
        unit: 'seconds',
        description: 'Average time per claim submission',
      },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.PAYMENT_POSTER]: {
    role: StaffRole.PAYMENT_POSTER,
    displayName: 'Payment Poster',
    benchmarks: {
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: {
        target: 25,
        minimum: 15,
        excellent: 40,
        unit: 'payments/hour',
        description: 'Number of payments posted per hour',
      },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: {
        target: 150,
        minimum: 100,
        excellent: 200,
        unit: 'accounts/day',
        description: 'Number of accounts processed per day',
      },
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 98,
        minimum: 95,
        excellent: 99.5,
        unit: '%',
        description: 'Payment posting accuracy rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 120,
        minimum: 180,
        excellent: 90,
        unit: 'seconds',
        description: 'Average time per payment posting',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.COLLECTOR]: {
    role: StaffRole.COLLECTOR,
    displayName: 'Collector',
    benchmarks: {
      [BenchmarkMetric.CALLS_PER_HOUR]: {
        target: 10,
        minimum: 6,
        excellent: 15,
        unit: 'calls/hour',
        description: 'Number of collection calls per hour',
      },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: {
        target: 60,
        minimum: 40,
        excellent: 80,
        unit: 'accounts/day',
        description: 'Number of accounts worked per day',
      },
      [BenchmarkMetric.COLLECTION_RATE]: {
        target: 30,
        minimum: 20,
        excellent: 45,
        unit: '%',
        description: 'Promise to pay conversion rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 300,
        minimum: 420,
        excellent: 240,
        unit: 'seconds',
        description: 'Average call duration',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.ACCURACY_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.DENIAL_SPECIALIST]: {
    role: StaffRole.DENIAL_SPECIALIST,
    displayName: 'Denial Specialist',
    benchmarks: {
      [BenchmarkMetric.DENIALS_PER_DAY]: {
        target: 25,
        minimum: 15,
        excellent: 40,
        unit: 'denials/day',
        description: 'Number of denials worked per day',
      },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: {
        target: 50,
        minimum: 35,
        excellent: 70,
        unit: '%',
        description: 'Percentage of denials successfully overturned',
      },
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 95,
        minimum: 90,
        excellent: 99,
        unit: '%',
        description: 'Appeal accuracy rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 900,
        minimum: 1200,
        excellent: 600,
        unit: 'seconds',
        description: 'Average time per denial worked',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.ELIGIBILITY_SPECIALIST]: {
    role: StaffRole.ELIGIBILITY_SPECIALIST,
    displayName: 'Eligibility Specialist',
    benchmarks: {
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: {
        target: 75,
        minimum: 50,
        excellent: 100,
        unit: 'accounts/day',
        description: 'Number of eligibility verifications per day',
      },
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 98,
        minimum: 95,
        excellent: 99.5,
        unit: '%',
        description: 'Eligibility verification accuracy rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 300,
        minimum: 420,
        excellent: 240,
        unit: 'seconds',
        description: 'Average time per eligibility check',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.CODER]: {
    role: StaffRole.CODER,
    displayName: 'Coder',
    benchmarks: {
      [BenchmarkMetric.CLAIMS_PER_HOUR]: {
        target: 8,
        minimum: 5,
        excellent: 12,
        unit: 'charts/hour',
        description: 'Number of charts coded per hour',
      },
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 95,
        minimum: 90,
        excellent: 98,
        unit: '%',
        description: 'Coding accuracy rate',
      },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: {
        target: 450,
        minimum: 600,
        excellent: 300,
        unit: 'seconds',
        description: 'Average time per chart coded',
      },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.SUPERVISOR]: {
    role: StaffRole.SUPERVISOR,
    displayName: 'Supervisor',
    benchmarks: {
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 98,
        minimum: 95,
        excellent: 99.5,
        unit: '%',
        description: 'Team quality audit score',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
  [StaffRole.MANAGER]: {
    role: StaffRole.MANAGER,
    displayName: 'Manager',
    benchmarks: {
      [BenchmarkMetric.ACCURACY_RATE]: {
        target: 97,
        minimum: 94,
        excellent: 99,
        unit: '%',
        description: 'Department quality score',
      },
      [BenchmarkMetric.CLAIMS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.PAYMENTS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.ACCOUNTS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIALS_PER_DAY]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.CALLS_PER_HOUR]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.HANDLE_TIME_SECONDS]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.COLLECTION_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
      [BenchmarkMetric.DENIAL_OVERTURN_RATE]: { target: 0, minimum: 0, excellent: 0, unit: 'n/a', description: 'N/A' },
    },
  },
};

// ============================================================================
// BENCHMARK FUNCTIONS
// ============================================================================

/**
 * Get benchmarks for a role
 */
export function getBenchmarksForRole(role: StaffRole): RoleBenchmarks {
  return ROLE_BENCHMARKS[role];
}

/**
 * Get all applicable metrics for a role
 */
export function getApplicableMetrics(role: StaffRole): BenchmarkMetric[] {
  const roleBenchmarks = ROLE_BENCHMARKS[role];
  return Object.entries(roleBenchmarks.benchmarks)
    .filter(([_, value]) => value.target > 0)
    .map(([key]) => key as BenchmarkMetric);
}

/**
 * Compare user performance to benchmark
 *
 * @param userId - User ID
 * @param metric - Metric to compare
 * @param actualValue - User's actual value
 * @param role - User's role for benchmark selection
 * @returns Benchmark comparison result
 */
export function compareToBenchmark(
  userId: string,
  metric: BenchmarkMetric,
  actualValue: number,
  role: StaffRole
): BenchmarkComparisonResult {
  const roleBenchmarks = ROLE_BENCHMARKS[role];
  const benchmark = roleBenchmarks.benchmarks[metric];

  if (!benchmark || benchmark.target === 0) {
    throw new Error(
      `Metric ${metric} is not applicable for role ${role}`
    );
  }

  const percentOfTarget = (actualValue / benchmark.target) * 100;

  // Determine rating
  let rating: BenchmarkRating;
  let gap: number;
  let recommendation: string;

  // For handle time, lower is better
  const isInverseMetric = metric === BenchmarkMetric.HANDLE_TIME_SECONDS;

  if (isInverseMetric) {
    if (actualValue <= benchmark.excellent) {
      rating = 'excellent';
      gap = 0;
      recommendation = 'Maintain current performance.';
    } else if (actualValue <= benchmark.target) {
      rating = 'above_target';
      gap = actualValue - benchmark.excellent;
      recommendation = 'Continue working toward excellent performance.';
    } else if (actualValue <= benchmark.minimum) {
      rating = 'at_target';
      gap = actualValue - benchmark.target;
      recommendation = 'Focus on efficiency improvements.';
    } else {
      rating = 'needs_improvement';
      gap = actualValue - benchmark.minimum;
      recommendation = 'Urgent attention needed to improve task completion speed.';
    }
  } else {
    if (actualValue >= benchmark.excellent) {
      rating = 'excellent';
      gap = 0;
      recommendation = 'Exceptional performance. Consider mentoring others.';
    } else if (actualValue >= benchmark.target) {
      rating = 'above_target';
      gap = benchmark.excellent - actualValue;
      recommendation = 'Great performance. Strive for excellence.';
    } else if (actualValue >= benchmark.minimum) {
      rating = 'at_target';
      gap = benchmark.target - actualValue;
      recommendation = 'Meets minimum standards. Work toward target.';
    } else {
      rating = 'needs_improvement';
      gap = benchmark.minimum - actualValue;
      recommendation = 'Below minimum standards. Requires immediate improvement.';
    }
  }

  return {
    userId,
    metric,
    actualValue,
    targetValue: benchmark.target,
    minimumValue: benchmark.minimum,
    excellentValue: benchmark.excellent,
    percentOfTarget: Math.round(percentOfTarget * 10) / 10,
    rating,
    gap: Math.round(gap * 10) / 10,
    recommendation,
  };
}

/**
 * Rank a user within their team for a specific metric
 *
 * @param userId - User ID to rank
 * @param metric - Metric to rank by
 * @param teamValues - Array of { userId, value } for all team members
 * @returns Team ranking result
 */
export function rankInTeam(
  userId: string,
  metric: BenchmarkMetric,
  teamValues: Array<{ userId: string; value: number }>
): TeamRankingResult {
  // For handle time, lower is better
  const isInverseMetric = metric === BenchmarkMetric.HANDLE_TIME_SECONDS;

  // Sort team values
  const sorted = [...teamValues].sort((a, b) =>
    isInverseMetric ? a.value - b.value : b.value - a.value
  );

  const userIndex = sorted.findIndex((t) => t.userId === userId);
  if (userIndex === -1) {
    throw new Error(`User ${userId} not found in team values`);
  }

  const rank = userIndex + 1;
  const totalUsers = sorted.length;
  const percentile = ((totalUsers - rank + 1) / totalUsers) * 100;

  return {
    userId,
    rank,
    totalUsers,
    percentile: Math.round(percentile * 10) / 10,
    value: sorted[userIndex].value,
    metric,
  };
}

/**
 * Identify top performers for a metric
 *
 * @param metric - Metric to rank by
 * @param teamValues - Array of user values
 * @param count - Number of top performers to return
 * @param role - Role for benchmark comparison
 * @returns Leaderboard result
 */
export function identifyTopPerformers(
  metric: BenchmarkMetric,
  teamValues: Array<{ userId: string; userName?: string; value: number }>,
  count: number,
  role: StaffRole,
  dateRange: { startDate: Date; endDate: Date }
): LeaderboardResult {
  const isInverseMetric = metric === BenchmarkMetric.HANDLE_TIME_SECONDS;

  // Sort and get top performers
  const sorted = [...teamValues].sort((a, b) =>
    isInverseMetric ? a.value - b.value : b.value - a.value
  );

  const benchmark = ROLE_BENCHMARKS[role].benchmarks[metric];

  const topPerformers: TopPerformer[] = sorted.slice(0, count).map((t, i) => {
    const comparison = compareToBenchmark(t.userId, metric, t.value, role);
    return {
      userId: t.userId,
      userName: t.userName,
      rank: i + 1,
      value: t.value,
      percentOfTarget: comparison.percentOfTarget,
      rating: comparison.rating,
    };
  });

  // Calculate team statistics
  const values = teamValues.map((t) => t.value);
  const teamAverage = values.reduce((a, b) => a + b, 0) / values.length;
  const sortedValues = [...values].sort((a, b) => a - b);
  const teamMedian =
    sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] +
          sortedValues[sortedValues.length / 2]) /
        2
      : sortedValues[Math.floor(sortedValues.length / 2)];

  return {
    metric,
    dateRange,
    topPerformers,
    teamAverage: Math.round(teamAverage * 10) / 10,
    teamMedian: Math.round(teamMedian * 10) / 10,
  };
}

/**
 * Identify training needs for a user
 *
 * @param userId - User ID
 * @param role - User's role
 * @param metrics - Current metrics for the user
 * @returns Training needs assessment
 */
export function identifyTrainingNeeds(
  userId: string,
  role: StaffRole,
  metrics: Array<{
    taskType: TaskType;
    metric: BenchmarkMetric;
    currentValue: number;
    trend?: 'improving' | 'stable' | 'declining';
  }>
): TrainingNeedsResult {
  const roleBenchmarks = ROLE_BENCHMARKS[role];
  const areas: TrainingArea[] = [];
  const recommendedTraining: TrainingRecommendation[] = [];

  let totalGapScore = 0;
  let criticalCount = 0;

  for (const m of metrics) {
    const benchmark = roleBenchmarks.benchmarks[m.metric];
    if (!benchmark || benchmark.target === 0) continue;

    const isInverseMetric = m.metric === BenchmarkMetric.HANDLE_TIME_SECONDS;
    let gap: number;
    let gapPercentage: number;

    if (isInverseMetric) {
      gap = m.currentValue - benchmark.target;
      gapPercentage = ((m.currentValue - benchmark.target) / benchmark.target) * 100;
    } else {
      gap = benchmark.target - m.currentValue;
      gapPercentage = ((benchmark.target - m.currentValue) / benchmark.target) * 100;
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (isInverseMetric) {
      if (m.currentValue <= benchmark.target) {
        severity = 'low';
      } else if (m.currentValue <= benchmark.minimum) {
        severity = 'medium';
      } else if (m.currentValue <= benchmark.minimum * 1.5) {
        severity = 'high';
      } else {
        severity = 'critical';
        criticalCount++;
      }
    } else {
      if (m.currentValue >= benchmark.target) {
        severity = 'low';
      } else if (m.currentValue >= benchmark.minimum) {
        severity = 'medium';
      } else if (m.currentValue >= benchmark.minimum * 0.75) {
        severity = 'high';
      } else {
        severity = 'critical';
        criticalCount++;
      }
    }

    if (severity !== 'low') {
      areas.push({
        taskType: m.taskType,
        metric: m.metric,
        currentPerformance: m.currentValue,
        targetPerformance: benchmark.target,
        gap,
        gapPercentage: Math.round(Math.abs(gapPercentage) * 10) / 10,
        severity,
        trend: m.trend,
      });

      // Add training recommendation
      recommendedTraining.push(generateTrainingRecommendation(m.taskType, severity));

      // Calculate gap score contribution
      const severityWeights = { low: 0, medium: 25, high: 50, critical: 100 };
      totalGapScore += severityWeights[severity];
    }
  }

  // Calculate priority score (0-100)
  const priorityScore = Math.min(100, totalGapScore / Math.max(1, metrics.length));

  // Determine overall assessment
  let overallAssessment: TrainingAssessment;
  if (criticalCount > 0) {
    overallAssessment = 'urgent_attention';
  } else if (areas.filter((a) => a.severity === 'high').length > 0) {
    overallAssessment = 'needs_development';
  } else if (areas.length > 0) {
    overallAssessment = 'satisfactory';
  } else {
    overallAssessment = 'proficient';
  }

  // Sort recommendations by priority
  recommendedTraining.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    userId,
    role,
    overallAssessment,
    areas,
    recommendedTraining,
    priorityScore: Math.round(priorityScore),
  };
}

/**
 * Generate training recommendation for a task type
 */
function generateTrainingRecommendation(
  taskType: TaskType,
  severity: 'low' | 'medium' | 'high' | 'critical'
): TrainingRecommendation {
  const trainingMap: Record<TaskType, Omit<TrainingRecommendation, 'priority'>> = {
    [TaskType.CHARGE_ENTRY]: {
      area: TaskType.CHARGE_ENTRY,
      title: 'Charge Capture Fundamentals',
      description: 'Training on accurate charge entry and validation processes.',
      estimatedDurationHours: 4,
      resources: ['Charge Capture Manual', 'CPT Code Reference Guide'],
    },
    [TaskType.CLAIM_SUBMISSION]: {
      area: TaskType.CLAIM_SUBMISSION,
      title: 'Clean Claim Submission',
      description: 'Best practices for submitting clean claims with high first-pass acceptance.',
      estimatedDurationHours: 6,
      resources: ['Payer Guidelines', 'CMS Billing Manual'],
    },
    [TaskType.PAYMENT_POSTING]: {
      area: TaskType.PAYMENT_POSTING,
      title: 'Payment Posting Efficiency',
      description: 'Training on ERA interpretation and efficient payment posting workflows.',
      estimatedDurationHours: 4,
      resources: ['ERA 835 Reference', 'Payment Posting SOP'],
    },
    [TaskType.DENIAL_WORK]: {
      area: TaskType.DENIAL_WORK,
      title: 'Denial Management Excellence',
      description: 'Strategies for effective denial analysis and appeal writing.',
      estimatedDurationHours: 8,
      resources: ['CARC/RARC Guide', 'Appeal Letter Templates'],
    },
    [TaskType.COLLECTION_CALL]: {
      area: TaskType.COLLECTION_CALL,
      title: 'Patient Collections Communication',
      description: 'Effective communication techniques for patient collections.',
      estimatedDurationHours: 4,
      resources: ['Collection Scripts', 'FDCPA Compliance Guide'],
    },
    [TaskType.ELIGIBILITY_VERIFICATION]: {
      area: TaskType.ELIGIBILITY_VERIFICATION,
      title: 'Eligibility Verification Mastery',
      description: 'Training on payer eligibility systems and verification workflows.',
      estimatedDurationHours: 4,
      resources: ['Payer Portal Guides', 'Eligibility SOP'],
    },
    [TaskType.CODING]: {
      area: TaskType.CODING,
      title: 'Medical Coding Accuracy',
      description: 'ICD-10 and CPT coding guidelines and documentation requirements.',
      estimatedDurationHours: 16,
      resources: ['ICD-10-CM Guidelines', 'CPT Assistant'],
    },
    [TaskType.OTHER]: {
      area: TaskType.OTHER,
      title: 'General RCM Training',
      description: 'Comprehensive revenue cycle management fundamentals.',
      estimatedDurationHours: 8,
      resources: ['RCM Best Practices Guide'],
    },
  };

  const priority: 'low' | 'medium' | 'high' =
    severity === 'critical' ? 'high' : severity;

  return {
    ...trainingMap[taskType],
    priority,
  };
}

/**
 * Get all staff roles
 */
export function getAllStaffRoles(): StaffRole[] {
  return Object.values(StaffRole);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: StaffRole): string {
  return ROLE_BENCHMARKS[role].displayName;
}

/**
 * Get benchmark metric display name
 */
export function getBenchmarkMetricDisplayName(metric: BenchmarkMetric): string {
  const displayNames: Record<BenchmarkMetric, string> = {
    [BenchmarkMetric.CLAIMS_PER_HOUR]: 'Claims per Hour',
    [BenchmarkMetric.ACCOUNTS_PER_DAY]: 'Accounts per Day',
    [BenchmarkMetric.PAYMENTS_PER_HOUR]: 'Payments per Hour',
    [BenchmarkMetric.DENIALS_PER_DAY]: 'Denials per Day',
    [BenchmarkMetric.CALLS_PER_HOUR]: 'Calls per Hour',
    [BenchmarkMetric.ACCURACY_RATE]: 'Accuracy Rate',
    [BenchmarkMetric.HANDLE_TIME_SECONDS]: 'Handle Time',
    [BenchmarkMetric.COLLECTION_RATE]: 'Collection Rate',
    [BenchmarkMetric.DENIAL_OVERTURN_RATE]: 'Denial Overturn Rate',
  };
  return displayNames[metric] || metric;
}
