/**
 * Productivity Metrics Calculator
 *
 * Calculates staff productivity metrics including accounts touched, claims processed,
 * payments posted, denials worked, calls completed, average handle time,
 * accuracy rate, and composite efficiency scores.
 */

import { TaskType, type DateRange, type TimeEntry } from './time-tracking.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Work activity record (represents a unit of work)
 */
export interface WorkActivity {
  id: string;
  userId: string;
  activityType: ActivityType;
  accountId?: string;
  claimId?: string;
  timestamp: Date;
  duration?: number; // seconds
  result?: ActivityResult;
  metadata?: Record<string, unknown>;
}

/**
 * Activity types for productivity tracking
 */
export enum ActivityType {
  ACCOUNT_TOUCH = 'ACCOUNT_TOUCH',
  CLAIM_SUBMITTED = 'CLAIM_SUBMITTED',
  PAYMENT_POSTED = 'PAYMENT_POSTED',
  DENIAL_WORKED = 'DENIAL_WORKED',
  COLLECTION_CALL = 'COLLECTION_CALL',
  ELIGIBILITY_CHECK = 'ELIGIBILITY_CHECK',
  CHARGE_ENTERED = 'CHARGE_ENTERED',
  APPEAL_FILED = 'APPEAL_FILED',
  CODING_COMPLETED = 'CODING_COMPLETED',
}

/**
 * Result of an activity
 */
export enum ActivityResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
}

/**
 * Metric count result
 */
export interface MetricCountResult {
  userId: string;
  dateRange: DateRange;
  count: number;
  successful?: number;
  failed?: number;
  successRate?: number;
}

/**
 * Average handle time result
 */
export interface AverageHandleTimeResult {
  userId: string;
  taskType: TaskType;
  averageSeconds: number;
  averageMinutes: number;
  sampleSize: number;
  minSeconds: number;
  maxSeconds: number;
  medianSeconds: number;
}

/**
 * Accuracy rate result
 */
export interface AccuracyRateResult {
  userId: string;
  taskType: TaskType;
  totalTasks: number;
  correctTasks: number;
  errorTasks: number;
  accuracyRate: number;
  errorRate: number;
  dateRange: DateRange;
}

/**
 * Efficiency score result
 */
export interface EfficiencyScoreResult {
  userId: string;
  overallScore: number; // 0-100
  components: EfficiencyComponents;
  rating: EfficiencyRating;
  strengths: string[];
  improvementAreas: string[];
  dateRange: DateRange;
}

/**
 * Components of efficiency score
 */
export interface EfficiencyComponents {
  volumeScore: number; // Based on volume vs benchmarks
  speedScore: number; // Based on handle time vs benchmarks
  accuracyScore: number; // Based on error rate
  consistencyScore: number; // Based on day-to-day variation
}

/**
 * Efficiency rating category
 */
export type EfficiencyRating =
  | 'exceptional'
  | 'above_average'
  | 'average'
  | 'below_average'
  | 'needs_improvement';

/**
 * Error record for accuracy tracking
 */
export interface ErrorRecord {
  id: string;
  userId: string;
  taskType: TaskType;
  errorType: string;
  errorDescription?: string;
  timestamp: Date;
  accountId?: string;
  claimId?: string;
  corrected?: boolean;
  correctedBy?: string;
  correctedAt?: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;

  const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Get efficiency rating from score
 */
function getRatingFromScore(score: number): EfficiencyRating {
  if (score >= 90) return 'exceptional';
  if (score >= 75) return 'above_average';
  if (score >= 50) return 'average';
  if (score >= 25) return 'below_average';
  return 'needs_improvement';
}

// ============================================================================
// PRODUCTIVITY METRICS FUNCTIONS
// ============================================================================

/**
 * Calculate accounts touched by a user in a date range
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param activities - Work activities from database
 * @returns Count of unique accounts touched
 */
export function calculateAccountsTouched(
  userId: string,
  dateRange: DateRange,
  activities: WorkActivity[]
): MetricCountResult {
  const filteredActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.timestamp >= dateRange.startDate &&
      a.timestamp <= dateRange.endDate &&
      a.accountId
  );

  // Count unique accounts
  const uniqueAccounts = new Set(filteredActivities.map((a) => a.accountId));

  return {
    userId,
    dateRange,
    count: uniqueAccounts.size,
  };
}

/**
 * Calculate claims processed (submitted) by a user
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param activities - Work activities from database
 * @returns Count of claims processed with success rate
 */
export function calculateClaimsProcessed(
  userId: string,
  dateRange: DateRange,
  activities: WorkActivity[]
): MetricCountResult {
  const filteredActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.activityType === ActivityType.CLAIM_SUBMITTED &&
      a.timestamp >= dateRange.startDate &&
      a.timestamp <= dateRange.endDate
  );

  const successful = filteredActivities.filter(
    (a) => a.result === ActivityResult.SUCCESS
  ).length;
  const failed = filteredActivities.filter(
    (a) => a.result === ActivityResult.FAILURE
  ).length;

  const total = filteredActivities.length;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return {
    userId,
    dateRange,
    count: total,
    successful,
    failed,
    successRate,
  };
}

/**
 * Calculate payments posted by a user
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param activities - Work activities from database
 * @returns Count of payments posted
 */
export function calculatePaymentsPosted(
  userId: string,
  dateRange: DateRange,
  activities: WorkActivity[]
): MetricCountResult {
  const filteredActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.activityType === ActivityType.PAYMENT_POSTED &&
      a.timestamp >= dateRange.startDate &&
      a.timestamp <= dateRange.endDate
  );

  const successful = filteredActivities.filter(
    (a) => a.result === ActivityResult.SUCCESS
  ).length;
  const failed = filteredActivities.filter(
    (a) => a.result === ActivityResult.FAILURE
  ).length;

  return {
    userId,
    dateRange,
    count: filteredActivities.length,
    successful,
    failed,
    successRate:
      filteredActivities.length > 0
        ? (successful / filteredActivities.length) * 100
        : 0,
  };
}

/**
 * Calculate denials worked by a user
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param activities - Work activities from database
 * @returns Count of denials worked with resolution rate
 */
export function calculateDenialsWorked(
  userId: string,
  dateRange: DateRange,
  activities: WorkActivity[]
): MetricCountResult {
  const filteredActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.activityType === ActivityType.DENIAL_WORKED &&
      a.timestamp >= dateRange.startDate &&
      a.timestamp <= dateRange.endDate
  );

  const successful = filteredActivities.filter(
    (a) => a.result === ActivityResult.SUCCESS
  ).length;
  const failed = filteredActivities.filter(
    (a) => a.result === ActivityResult.FAILURE
  ).length;

  return {
    userId,
    dateRange,
    count: filteredActivities.length,
    successful,
    failed,
    successRate:
      filteredActivities.length > 0
        ? (successful / filteredActivities.length) * 100
        : 0,
  };
}

/**
 * Calculate collection calls completed by a user
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param activities - Work activities from database
 * @returns Count of calls completed
 */
export function calculateCallsCompleted(
  userId: string,
  dateRange: DateRange,
  activities: WorkActivity[]
): MetricCountResult {
  const filteredActivities = activities.filter(
    (a) =>
      a.userId === userId &&
      a.activityType === ActivityType.COLLECTION_CALL &&
      a.timestamp >= dateRange.startDate &&
      a.timestamp <= dateRange.endDate
  );

  const successful = filteredActivities.filter(
    (a) => a.result === ActivityResult.SUCCESS
  ).length;

  return {
    userId,
    dateRange,
    count: filteredActivities.length,
    successful,
    successRate:
      filteredActivities.length > 0
        ? (successful / filteredActivities.length) * 100
        : 0,
  };
}

/**
 * Calculate average handle time for a specific task type
 *
 * @param userId - The user ID
 * @param taskType - The task type to calculate
 * @param timeEntries - Time entries from database
 * @returns Average handle time statistics
 */
export function calculateAverageHandleTime(
  userId: string,
  taskType: TaskType,
  timeEntries: TimeEntry[]
): AverageHandleTimeResult {
  const filteredEntries = timeEntries.filter(
    (e) => e.userId === userId && e.taskType === taskType && e.duration
  );

  const durations = filteredEntries.map((e) => e.duration || 0);

  if (durations.length === 0) {
    return {
      userId,
      taskType,
      averageSeconds: 0,
      averageMinutes: 0,
      sampleSize: 0,
      minSeconds: 0,
      maxSeconds: 0,
      medianSeconds: 0,
    };
  }

  const totalSeconds = durations.reduce((a, b) => a + b, 0);
  const averageSeconds = totalSeconds / durations.length;

  return {
    userId,
    taskType,
    averageSeconds,
    averageMinutes: averageSeconds / 60,
    sampleSize: durations.length,
    minSeconds: Math.min(...durations),
    maxSeconds: Math.max(...durations),
    medianSeconds: calculateMedian(durations),
  };
}

/**
 * Calculate accuracy rate for a task type
 *
 * @param userId - The user ID
 * @param taskType - The task type to calculate
 * @param dateRange - Date range for calculation
 * @param totalTasks - Total tasks completed
 * @param errors - Error records from database
 * @returns Accuracy rate result
 */
export function calculateAccuracyRate(
  userId: string,
  taskType: TaskType,
  dateRange: DateRange,
  totalTasks: number,
  errors: ErrorRecord[]
): AccuracyRateResult {
  const errorCount = errors.filter(
    (e) =>
      e.userId === userId &&
      e.taskType === taskType &&
      e.timestamp >= dateRange.startDate &&
      e.timestamp <= dateRange.endDate
  ).length;

  const correctTasks = Math.max(0, totalTasks - errorCount);
  const accuracyRate = totalTasks > 0 ? (correctTasks / totalTasks) * 100 : 100;
  const errorRate = totalTasks > 0 ? (errorCount / totalTasks) * 100 : 0;

  return {
    userId,
    taskType,
    totalTasks,
    correctTasks,
    errorTasks: errorCount,
    accuracyRate,
    errorRate,
    dateRange,
  };
}

/**
 * Calculate composite efficiency score (0-100)
 *
 * @param userId - The user ID
 * @param dateRange - Date range for calculation
 * @param metrics - Object containing various metric inputs
 * @param benchmarks - Benchmark values for comparison
 * @returns Efficiency score result
 */
export function calculateEfficiencyScore(
  userId: string,
  dateRange: DateRange,
  metrics: {
    accountsTouched: number;
    claimsProcessed: number;
    paymentsPosted: number;
    averageHandleTime: number; // seconds
    accuracyRate: number; // percentage
    dailyVolumes: number[]; // array of daily volumes for consistency
  },
  benchmarks: {
    accountsTouchedTarget: number;
    claimsProcessedTarget: number;
    paymentsPostedTarget: number;
    handleTimeTarget: number; // seconds
    accuracyTarget: number; // percentage
  }
): EfficiencyScoreResult {
  // Calculate volume score (weighted average of volume metrics)
  const accountsRatio =
    metrics.accountsTouched / (benchmarks.accountsTouchedTarget || 1);
  const claimsRatio =
    metrics.claimsProcessed / (benchmarks.claimsProcessedTarget || 1);
  const paymentsRatio =
    metrics.paymentsPosted / (benchmarks.paymentsPostedTarget || 1);

  const volumeScore = Math.min(
    100,
    ((accountsRatio + claimsRatio + paymentsRatio) / 3) * 100
  );

  // Calculate speed score (inverse - faster is better)
  const handleTimeRatio =
    metrics.averageHandleTime > 0
      ? benchmarks.handleTimeTarget / metrics.averageHandleTime
      : 1;
  const speedScore = Math.min(100, handleTimeRatio * 100);

  // Calculate accuracy score
  const accuracyScore = Math.min(100, metrics.accuracyRate);

  // Calculate consistency score (based on coefficient of variation)
  let consistencyScore = 100;
  if (metrics.dailyVolumes.length > 1) {
    const mean =
      metrics.dailyVolumes.reduce((a, b) => a + b, 0) /
      metrics.dailyVolumes.length;
    const stdDev = calculateStdDev(metrics.dailyVolumes, mean);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    // Lower variation = higher consistency score
    consistencyScore = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
  }

  // Calculate overall score (weighted)
  const weights = {
    volume: 0.3,
    speed: 0.25,
    accuracy: 0.35,
    consistency: 0.1,
  };

  const overallScore =
    volumeScore * weights.volume +
    speedScore * weights.speed +
    accuracyScore * weights.accuracy +
    consistencyScore * weights.consistency;

  // Identify strengths and improvement areas
  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  if (volumeScore >= 80) strengths.push('High work volume');
  else if (volumeScore < 50) improvementAreas.push('Increase work volume');

  if (speedScore >= 80) strengths.push('Fast task completion');
  else if (speedScore < 50) improvementAreas.push('Improve task completion speed');

  if (accuracyScore >= 95) strengths.push('Excellent accuracy');
  else if (accuracyScore < 90) improvementAreas.push('Reduce error rate');

  if (consistencyScore >= 80) strengths.push('Consistent daily output');
  else if (consistencyScore < 50)
    improvementAreas.push('Improve daily consistency');

  return {
    userId,
    overallScore: Math.round(overallScore * 10) / 10,
    components: {
      volumeScore: Math.round(volumeScore * 10) / 10,
      speedScore: Math.round(speedScore * 10) / 10,
      accuracyScore: Math.round(accuracyScore * 10) / 10,
      consistencyScore: Math.round(consistencyScore * 10) / 10,
    },
    rating: getRatingFromScore(overallScore),
    strengths,
    improvementAreas,
    dateRange,
  };
}

/**
 * Get activity type display name
 */
export function getActivityTypeDisplayName(activityType: ActivityType): string {
  const displayNames: Record<ActivityType, string> = {
    [ActivityType.ACCOUNT_TOUCH]: 'Account Touch',
    [ActivityType.CLAIM_SUBMITTED]: 'Claim Submitted',
    [ActivityType.PAYMENT_POSTED]: 'Payment Posted',
    [ActivityType.DENIAL_WORKED]: 'Denial Worked',
    [ActivityType.COLLECTION_CALL]: 'Collection Call',
    [ActivityType.ELIGIBILITY_CHECK]: 'Eligibility Check',
    [ActivityType.CHARGE_ENTERED]: 'Charge Entered',
    [ActivityType.APPEAL_FILED]: 'Appeal Filed',
    [ActivityType.CODING_COMPLETED]: 'Coding Completed',
  };
  return displayNames[activityType] || activityType;
}

/**
 * Get all activity types
 */
export function getAllActivityTypes(): ActivityType[] {
  return Object.values(ActivityType);
}
