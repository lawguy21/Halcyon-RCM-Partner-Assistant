/**
 * Productivity Module Index
 *
 * Exports all productivity tracking and metrics functionality
 */

// Time tracking
export {
  TaskType,
  type TimeEntry,
  type ActiveTimer,
  type DateRange,
  type ManualTimeInput,
  type ProductiveTimeResult,
  type DailyTimeEntry,
  type StartTimerResult,
  type StopTimerResult,
  startTimer,
  stopTimer,
  getActiveTimer,
  hasActiveTimer,
  getActiveTimerElapsed,
  cancelTimer,
  logManualTime,
  calculateProductiveTime,
  getAllActiveTimers,
  clearAllActiveTimers,
  formatDuration,
  parseDuration,
  getAllTaskTypes,
  getTaskTypeDisplayName,
} from './time-tracking.js';

// Metrics calculator
export {
  ActivityType,
  ActivityResult,
  type WorkActivity,
  type MetricCountResult,
  type AverageHandleTimeResult,
  type AccuracyRateResult,
  type EfficiencyScoreResult,
  type EfficiencyComponents,
  type EfficiencyRating,
  type ErrorRecord,
  calculateAccountsTouched,
  calculateClaimsProcessed,
  calculatePaymentsPosted,
  calculateDenialsWorked,
  calculateCallsCompleted,
  calculateAverageHandleTime,
  calculateAccuracyRate,
  calculateEfficiencyScore,
  getActivityTypeDisplayName,
  getAllActivityTypes,
} from './metrics-calculator.js';

// Benchmarks
export {
  StaffRole,
  BenchmarkMetric,
  ROLE_BENCHMARKS,
  type RoleBenchmarks,
  type BenchmarkValue,
  type BenchmarkComparisonResult,
  type BenchmarkRating,
  type TeamRankingResult,
  type TopPerformer,
  type LeaderboardResult,
  type TrainingNeedsResult,
  type TrainingAssessment,
  type TrainingArea,
  type TrainingRecommendation,
  getBenchmarksForRole,
  getApplicableMetrics,
  compareToBenchmark,
  rankInTeam,
  identifyTopPerformers,
  identifyTrainingNeeds,
  getAllStaffRoles,
  getRoleDisplayName,
  getBenchmarkMetricDisplayName,
} from './benchmarks.js';
