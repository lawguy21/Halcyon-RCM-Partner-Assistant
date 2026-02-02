// @ts-nocheck
/**
 * Productivity Service
 *
 * Handles staff productivity tracking, metrics calculation,
 * goal management, and reporting.
 */

import { prisma } from '../lib/prisma.js';
import {
  TaskType,
  ActivityType,
  ActivityResult,
  StaffRole,
  BenchmarkMetric,
  startTimer as coreStartTimer,
  stopTimer as coreStopTimer,
  getActiveTimer as coreGetActiveTimer,
  hasActiveTimer as coreHasActiveTimer,
  logManualTime as coreLogManualTime,
  calculateProductiveTime,
  calculateAccountsTouched,
  calculateClaimsProcessed,
  calculatePaymentsPosted,
  calculateDenialsWorked,
  calculateCallsCompleted,
  calculateAverageHandleTime,
  calculateEfficiencyScore,
  compareToBenchmark,
  rankInTeam,
  identifyTopPerformers,
  identifyTrainingNeeds,
  type TimeEntry,
  type WorkActivity,
  type DateRange,
  type ProductiveTimeResult,
  type EfficiencyScoreResult,
  type BenchmarkComparisonResult,
  type TeamRankingResult,
  type LeaderboardResult,
  type TrainingNeedsResult,
  type ErrorRecord,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface StartTaskInput {
  userId: string;
  taskType: TaskType;
  accountId?: string;
  claimId?: string;
  metadata?: Record<string, unknown>;
}

export interface CompleteTaskInput {
  userId: string;
  result: ActivityResult;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ManualTimeInput {
  userId: string;
  taskType: TaskType;
  duration: number; // seconds
  notes?: string;
  accountId?: string;
  claimId?: string;
  date?: Date;
}

export interface ProductivityFilters {
  userId?: string;
  userIds?: string[];
  managerId?: string;
  department?: string;
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface GoalInput {
  userId: string;
  metric: BenchmarkMetric;
  target: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
}

export interface GoalProgress {
  goalId: string;
  metric: BenchmarkMetric;
  target: number;
  current: number;
  percentComplete: number;
  onTrack: boolean;
  projectedCompletion?: number;
  daysRemaining: number;
}

export interface PersonalProductivity {
  userId: string;
  dateRange: DateRange;
  productiveTime: ProductiveTimeResult;
  efficiencyScore: EfficiencyScoreResult;
  metrics: {
    accountsTouched: number;
    claimsProcessed: number;
    paymentsPosted: number;
    denialsWorked: number;
    callsCompleted: number;
  };
  benchmarkComparisons: BenchmarkComparisonResult[];
  goalProgress: GoalProgress[];
  trends: {
    date: string;
    efficiency: number;
    volume: number;
  }[];
}

export interface TeamProductivity {
  managerId: string;
  dateRange: DateRange;
  teamSize: number;
  teamMetrics: {
    totalAccountsTouched: number;
    totalClaimsProcessed: number;
    totalPaymentsPosted: number;
    averageEfficiency: number;
  };
  memberProductivity: Array<{
    userId: string;
    userName?: string;
    efficiency: number;
    volume: number;
  }>;
  leaderboard: LeaderboardResult;
  trainingNeeds: TrainingNeedsResult[];
}

export interface DepartmentProductivity {
  department: string;
  dateRange: DateRange;
  teamCount: number;
  staffCount: number;
  metrics: {
    totalVolume: number;
    averageEfficiency: number;
    topPerformers: Array<{
      userId: string;
      userName?: string;
      efficiency: number;
    }>;
  };
  byRole: Array<{
    role: StaffRole;
    count: number;
    averageEfficiency: number;
  }>;
}

export interface ProductivityReport {
  generatedAt: Date;
  filters: ProductivityFilters;
  summary: {
    totalUsers: number;
    totalProductiveHours: number;
    averageEfficiency: number;
    totalAccountsTouched: number;
    totalClaimsProcessed: number;
    totalPaymentsPosted: number;
  };
  byUser: Array<{
    userId: string;
    userName?: string;
    productiveHours: number;
    efficiency: number;
    metrics: {
      accountsTouched: number;
      claimsProcessed: number;
      paymentsPosted: number;
    };
  }>;
  trends: Array<{
    date: string;
    totalVolume: number;
    averageEfficiency: number;
  }>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ProductivityService {
  // ==========================================================================
  // TASK TRACKING
  // ==========================================================================

  /**
   * Start tracking a task for a user
   */
  async startTask(input: StartTaskInput): Promise<{
    success: boolean;
    timer?: { userId: string; taskType: TaskType; startTime: Date };
    error?: string;
  }> {
    const result = coreStartTimer(
      input.userId,
      input.taskType,
      input.accountId,
      input.claimId,
      input.metadata
    );

    if (result.success && result.timer) {
      // Store in database for persistence across restarts
      await prisma.timeEntry.create({
        data: {
          userId: input.userId,
          taskType: input.taskType,
          accountId: input.accountId,
          claimId: input.claimId,
          startTime: result.timer.startTime,
          // endTime and duration will be set when completed
        },
      });
    }

    return {
      success: result.success,
      timer: result.timer,
      error: result.error,
    };
  }

  /**
   * Complete a task and record the time entry
   */
  async completeTask(input: CompleteTaskInput): Promise<{
    success: boolean;
    timeEntry?: TimeEntry;
    duration?: number;
    error?: string;
  }> {
    const activeTimer = coreGetActiveTimer(input.userId);
    if (!activeTimer) {
      return {
        success: false,
        error: 'No active timer found for this user.',
      };
    }

    const result = coreStopTimer(input.userId, input.notes);

    if (result.success && result.timeEntry) {
      // Update the database entry
      const existingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId: input.userId,
          taskType: activeTimer.taskType,
          endTime: null,
        },
        orderBy: { startTime: 'desc' },
      });

      if (existingEntry) {
        await prisma.timeEntry.update({
          where: { id: existingEntry.id },
          data: {
            endTime: result.timeEntry.endTime,
            duration: result.duration,
            notes: input.notes,
          },
        });
      }

      // Record the work activity
      await prisma.workActivity.create({
        data: {
          userId: input.userId,
          activityType: this.mapTaskTypeToActivityType(activeTimer.taskType),
          accountId: activeTimer.accountId,
          claimId: activeTimer.claimId,
          timestamp: new Date(),
          duration: result.duration,
          result: input.result,
          metadata: input.metadata,
        },
      });
    }

    return result;
  }

  /**
   * Get the active task for a user
   */
  async getActiveTask(userId: string): Promise<{
    userId: string;
    taskType: TaskType;
    accountId?: string;
    claimId?: string;
    startTime: Date;
    elapsedSeconds: number;
  } | null> {
    const timer = coreGetActiveTimer(userId);
    if (!timer) return null;

    const elapsedSeconds = Math.floor(
      (Date.now() - timer.startTime.getTime()) / 1000
    );

    return {
      userId: timer.userId,
      taskType: timer.taskType,
      accountId: timer.accountId,
      claimId: timer.claimId,
      startTime: timer.startTime,
      elapsedSeconds,
    };
  }

  /**
   * Log manual time entry
   */
  async logManualTime(input: ManualTimeInput): Promise<TimeEntry> {
    const timeEntry = coreLogManualTime({
      userId: input.userId,
      taskType: input.taskType,
      duration: input.duration,
      notes: input.notes,
      accountId: input.accountId,
      claimId: input.claimId,
      date: input.date,
    });

    // Save to database
    await prisma.timeEntry.create({
      data: {
        userId: timeEntry.userId,
        taskType: timeEntry.taskType,
        accountId: timeEntry.accountId,
        claimId: timeEntry.claimId,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        duration: timeEntry.duration,
        notes: timeEntry.notes,
      },
    });

    return timeEntry;
  }

  // ==========================================================================
  // PRODUCTIVITY RETRIEVAL
  // ==========================================================================

  /**
   * Get personal productivity dashboard for a user
   */
  async getMyProductivity(
    userId: string,
    dateRange: DateRange
  ): Promise<PersonalProductivity> {
    // Fetch time entries
    const timeEntries = await this.getTimeEntries(userId, dateRange);
    const activities = await this.getWorkActivities(userId, dateRange);
    const errors = await this.getErrorRecords(userId, dateRange);

    // Calculate productive time
    const productiveTime = calculateProductiveTime(
      userId,
      dateRange,
      timeEntries as TimeEntry[]
    );

    // Calculate individual metrics
    const accountsTouched = calculateAccountsTouched(
      userId,
      dateRange,
      activities as WorkActivity[]
    ).count;
    const claimsProcessed = calculateClaimsProcessed(
      userId,
      dateRange,
      activities as WorkActivity[]
    ).count;
    const paymentsPosted = calculatePaymentsPosted(
      userId,
      dateRange,
      activities as WorkActivity[]
    ).count;
    const denialsWorked = calculateDenialsWorked(
      userId,
      dateRange,
      activities as WorkActivity[]
    ).count;
    const callsCompleted = calculateCallsCompleted(
      userId,
      dateRange,
      activities as WorkActivity[]
    ).count;

    // Get user role for benchmarks
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const role = (user as any)?.role === 'ADMIN' ? StaffRole.SUPERVISOR : StaffRole.BILLER;

    // Calculate efficiency score
    const dailyVolumes = productiveTime.dailyBreakdown.map(
      (d) => d.totalSeconds / 3600
    );
    const avgHandleTime = calculateAverageHandleTime(
      userId,
      TaskType.CLAIM_SUBMISSION,
      timeEntries as TimeEntry[]
    );

    const efficiencyScore = calculateEfficiencyScore(
      userId,
      dateRange,
      {
        accountsTouched,
        claimsProcessed,
        paymentsPosted,
        averageHandleTime: avgHandleTime.averageSeconds,
        accuracyRate: 95, // Would calculate from actual errors
        dailyVolumes,
      },
      {
        accountsTouchedTarget: 50,
        claimsProcessedTarget: 100,
        paymentsPostedTarget: 150,
        handleTimeTarget: 240,
        accuracyTarget: 95,
      }
    );

    // Get benchmark comparisons
    const benchmarkComparisons: BenchmarkComparisonResult[] = [];
    try {
      benchmarkComparisons.push(
        compareToBenchmark(userId, BenchmarkMetric.ACCOUNTS_PER_DAY, accountsTouched / 5, role)
      );
      benchmarkComparisons.push(
        compareToBenchmark(userId, BenchmarkMetric.CLAIMS_PER_HOUR, claimsProcessed / productiveTime.totalHours, role)
      );
    } catch {
      // Metric not applicable for role
    }

    // Get goal progress
    const goalProgress = await this.trackGoalProgress(userId);

    // Calculate trends
    const trends = productiveTime.dailyBreakdown.map((d) => ({
      date: d.date,
      efficiency: efficiencyScore.overallScore,
      volume: d.totalSeconds / 3600,
    }));

    return {
      userId,
      dateRange,
      productiveTime,
      efficiencyScore,
      metrics: {
        accountsTouched,
        claimsProcessed,
        paymentsPosted,
        denialsWorked,
        callsCompleted,
      },
      benchmarkComparisons,
      goalProgress,
      trends,
    };
  }

  /**
   * Get team productivity for a manager
   */
  async getTeamProductivity(
    managerId: string,
    dateRange: DateRange
  ): Promise<TeamProductivity> {
    // Get team members (simplified - would use actual org structure)
    const teamMembers = await prisma.user.findMany({
      where: {
        // Would filter by manager relationship
      },
      take: 20,
    });

    const memberProductivity: TeamProductivity['memberProductivity'] = [];
    let totalAccounts = 0;
    let totalClaims = 0;
    let totalPayments = 0;
    let totalEfficiency = 0;

    for (const member of teamMembers) {
      const activities = await this.getWorkActivities(member.id, dateRange);
      const timeEntries = await this.getTimeEntries(member.id, dateRange);

      const accounts = calculateAccountsTouched(
        member.id,
        dateRange,
        activities as WorkActivity[]
      ).count;
      const claims = calculateClaimsProcessed(
        member.id,
        dateRange,
        activities as WorkActivity[]
      ).count;
      const payments = calculatePaymentsPosted(
        member.id,
        dateRange,
        activities as WorkActivity[]
      ).count;

      const productiveTime = calculateProductiveTime(
        member.id,
        dateRange,
        timeEntries as TimeEntry[]
      );
      const dailyVolumes = productiveTime.dailyBreakdown.map(
        (d) => d.totalSeconds / 3600
      );

      const efficiency = calculateEfficiencyScore(
        member.id,
        dateRange,
        {
          accountsTouched: accounts,
          claimsProcessed: claims,
          paymentsPosted: payments,
          averageHandleTime: 240,
          accuracyRate: 95,
          dailyVolumes,
        },
        {
          accountsTouchedTarget: 50,
          claimsProcessedTarget: 100,
          paymentsPostedTarget: 150,
          handleTimeTarget: 240,
          accuracyTarget: 95,
        }
      );

      memberProductivity.push({
        userId: member.id,
        userName: member.name || undefined,
        efficiency: efficiency.overallScore,
        volume: accounts + claims + payments,
      });

      totalAccounts += accounts;
      totalClaims += claims;
      totalPayments += payments;
      totalEfficiency += efficiency.overallScore;
    }

    // Create leaderboard
    const leaderboard = identifyTopPerformers(
      BenchmarkMetric.ACCOUNTS_PER_DAY,
      memberProductivity.map((m) => ({
        userId: m.userId,
        userName: m.userName,
        value: m.volume / 5, // Convert to daily
      })),
      10,
      StaffRole.BILLER,
      dateRange
    );

    // Identify training needs
    const trainingNeeds: TrainingNeedsResult[] = [];
    for (const member of memberProductivity.filter((m) => m.efficiency < 50)) {
      const needs = identifyTrainingNeeds(member.userId, StaffRole.BILLER, [
        {
          taskType: TaskType.CLAIM_SUBMISSION,
          metric: BenchmarkMetric.CLAIMS_PER_HOUR,
          currentValue: member.volume / 40,
        },
      ]);
      trainingNeeds.push(needs);
    }

    return {
      managerId,
      dateRange,
      teamSize: teamMembers.length,
      teamMetrics: {
        totalAccountsTouched: totalAccounts,
        totalClaimsProcessed: totalClaims,
        totalPaymentsPosted: totalPayments,
        averageEfficiency:
          teamMembers.length > 0 ? totalEfficiency / teamMembers.length : 0,
      },
      memberProductivity,
      leaderboard,
      trainingNeeds,
    };
  }

  /**
   * Get department productivity
   */
  async getDepartmentProductivity(
    department: string,
    dateRange: DateRange
  ): Promise<DepartmentProductivity> {
    // Simplified implementation
    const teamProductivity = await this.getTeamProductivity('admin', dateRange);

    return {
      department,
      dateRange,
      teamCount: 1,
      staffCount: teamProductivity.teamSize,
      metrics: {
        totalVolume:
          teamProductivity.teamMetrics.totalAccountsTouched +
          teamProductivity.teamMetrics.totalClaimsProcessed,
        averageEfficiency: teamProductivity.teamMetrics.averageEfficiency,
        topPerformers: teamProductivity.memberProductivity
          .sort((a, b) => b.efficiency - a.efficiency)
          .slice(0, 5)
          .map((m) => ({
            userId: m.userId,
            userName: m.userName,
            efficiency: m.efficiency,
          })),
      },
      byRole: [
        {
          role: StaffRole.BILLER,
          count: teamProductivity.teamSize,
          averageEfficiency: teamProductivity.teamMetrics.averageEfficiency,
        },
      ],
    };
  }

  /**
   * Generate detailed productivity report
   */
  async generateProductivityReport(
    filters: ProductivityFilters
  ): Promise<ProductivityReport> {
    const users = await prisma.user.findMany({
      where: filters.organizationId
        ? { organizationId: filters.organizationId }
        : undefined,
      take: 100,
    });

    const dateRange: DateRange = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };

    const byUser: ProductivityReport['byUser'] = [];
    let totalHours = 0;
    let totalEfficiency = 0;
    let totalAccounts = 0;
    let totalClaims = 0;
    let totalPayments = 0;

    for (const user of users) {
      const timeEntries = await this.getTimeEntries(user.id, dateRange);
      const activities = await this.getWorkActivities(user.id, dateRange);

      const productiveTime = calculateProductiveTime(
        user.id,
        dateRange,
        timeEntries as TimeEntry[]
      );

      const accounts = calculateAccountsTouched(
        user.id,
        dateRange,
        activities as WorkActivity[]
      ).count;
      const claims = calculateClaimsProcessed(
        user.id,
        dateRange,
        activities as WorkActivity[]
      ).count;
      const payments = calculatePaymentsPosted(
        user.id,
        dateRange,
        activities as WorkActivity[]
      ).count;

      const dailyVolumes = productiveTime.dailyBreakdown.map(
        (d) => d.totalSeconds / 3600
      );
      const efficiency = calculateEfficiencyScore(
        user.id,
        dateRange,
        {
          accountsTouched: accounts,
          claimsProcessed: claims,
          paymentsPosted: payments,
          averageHandleTime: 240,
          accuracyRate: 95,
          dailyVolumes,
        },
        {
          accountsTouchedTarget: 50,
          claimsProcessedTarget: 100,
          paymentsPostedTarget: 150,
          handleTimeTarget: 240,
          accuracyTarget: 95,
        }
      );

      byUser.push({
        userId: user.id,
        userName: user.name || undefined,
        productiveHours: productiveTime.totalHours,
        efficiency: efficiency.overallScore,
        metrics: {
          accountsTouched: accounts,
          claimsProcessed: claims,
          paymentsPosted: payments,
        },
      });

      totalHours += productiveTime.totalHours;
      totalEfficiency += efficiency.overallScore;
      totalAccounts += accounts;
      totalClaims += claims;
      totalPayments += payments;
    }

    return {
      generatedAt: new Date(),
      filters,
      summary: {
        totalUsers: users.length,
        totalProductiveHours: totalHours,
        averageEfficiency: users.length > 0 ? totalEfficiency / users.length : 0,
        totalAccountsTouched: totalAccounts,
        totalClaimsProcessed: totalClaims,
        totalPaymentsPosted: totalPayments,
      },
      byUser,
      trends: [], // Would calculate daily trends
    };
  }

  // ==========================================================================
  // GOAL MANAGEMENT
  // ==========================================================================

  /**
   * Set productivity goals for a user
   */
  async setGoals(
    userId: string,
    goals: GoalInput[]
  ): Promise<Array<{ id: string; metric: BenchmarkMetric; target: number }>> {
    const createdGoals = [];

    for (const goal of goals) {
      const created = await prisma.productivityGoal.create({
        data: {
          userId: goal.userId,
          metric: goal.metric,
          target: goal.target,
          period: goal.period,
          startDate: goal.startDate,
          endDate: goal.endDate,
        },
      });

      createdGoals.push({
        id: created.id,
        metric: goal.metric,
        target: goal.target,
      });
    }

    return createdGoals;
  }

  /**
   * Track goal progress for a user
   */
  async trackGoalProgress(userId: string): Promise<GoalProgress[]> {
    const activeGoals = await prisma.productivityGoal.findMany({
      where: {
        userId,
        endDate: { gte: new Date() },
      },
    });

    const progress: GoalProgress[] = [];

    for (const goal of activeGoals) {
      const dateRange: DateRange = {
        startDate: goal.startDate,
        endDate: new Date(),
      };

      const activities = await this.getWorkActivities(userId, dateRange);
      let current = 0;

      // Calculate current value based on metric
      switch (goal.metric) {
        case BenchmarkMetric.ACCOUNTS_PER_DAY:
          current = calculateAccountsTouched(
            userId,
            dateRange,
            activities as WorkActivity[]
          ).count;
          break;
        case BenchmarkMetric.CLAIMS_PER_HOUR:
          current = calculateClaimsProcessed(
            userId,
            dateRange,
            activities as WorkActivity[]
          ).count;
          break;
        case BenchmarkMetric.PAYMENTS_PER_HOUR:
          current = calculatePaymentsPosted(
            userId,
            dateRange,
            activities as WorkActivity[]
          ).count;
          break;
        default:
          current = 0;
      }

      const percentComplete = goal.target > 0 ? (current / goal.target) * 100 : 0;
      const daysRemaining = Math.ceil(
        (goal.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const daysElapsed = Math.ceil(
        (Date.now() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalDays = Math.ceil(
        (goal.endDate.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const expectedProgress = (daysElapsed / totalDays) * 100;
      const onTrack = percentComplete >= expectedProgress * 0.9;

      progress.push({
        goalId: goal.id,
        metric: goal.metric as BenchmarkMetric,
        target: goal.target,
        current,
        percentComplete: Math.round(percentComplete * 10) / 10,
        onTrack,
        projectedCompletion:
          daysElapsed > 0
            ? Math.round((current / daysElapsed) * totalDays)
            : undefined,
        daysRemaining,
      });
    }

    return progress;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async getTimeEntries(
    userId: string,
    dateRange: DateRange
  ): Promise<TimeEntry[]> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: dateRange.startDate },
        endTime: { lte: dateRange.endDate },
      },
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      taskType: e.taskType as TaskType,
      accountId: e.accountId || undefined,
      claimId: e.claimId || undefined,
      startTime: e.startTime,
      endTime: e.endTime || undefined,
      duration: e.duration || undefined,
      notes: e.notes || undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }

  private async getWorkActivities(
    userId: string,
    dateRange: DateRange
  ): Promise<WorkActivity[]> {
    const activities = await prisma.workActivity.findMany({
      where: {
        userId,
        timestamp: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    return activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      activityType: a.activityType as ActivityType,
      accountId: a.accountId || undefined,
      claimId: a.claimId || undefined,
      timestamp: a.timestamp,
      duration: a.duration || undefined,
      result: a.result as ActivityResult | undefined,
      metadata: a.metadata as Record<string, unknown> | undefined,
    }));
  }

  private async getErrorRecords(
    userId: string,
    dateRange: DateRange
  ): Promise<ErrorRecord[]> {
    // Would fetch from error tracking table
    return [];
  }

  private mapTaskTypeToActivityType(taskType: TaskType): ActivityType {
    const mapping: Record<TaskType, ActivityType> = {
      [TaskType.CHARGE_ENTRY]: ActivityType.CHARGE_ENTERED,
      [TaskType.CLAIM_SUBMISSION]: ActivityType.CLAIM_SUBMITTED,
      [TaskType.PAYMENT_POSTING]: ActivityType.PAYMENT_POSTED,
      [TaskType.DENIAL_WORK]: ActivityType.DENIAL_WORKED,
      [TaskType.COLLECTION_CALL]: ActivityType.COLLECTION_CALL,
      [TaskType.ELIGIBILITY_VERIFICATION]: ActivityType.ELIGIBILITY_CHECK,
      [TaskType.CODING]: ActivityType.CODING_COMPLETED,
      [TaskType.OTHER]: ActivityType.ACCOUNT_TOUCH,
    };
    return mapping[taskType] || ActivityType.ACCOUNT_TOUCH;
  }

  /**
   * Get leaderboard for a metric
   */
  async getLeaderboard(
    metric: BenchmarkMetric,
    dateRange: DateRange,
    limit: number = 10
  ): Promise<LeaderboardResult> {
    const users = await prisma.user.findMany({ take: 100 });

    const teamValues: Array<{ userId: string; userName?: string; value: number }> = [];

    for (const user of users) {
      const activities = await this.getWorkActivities(user.id, dateRange);
      let value = 0;

      switch (metric) {
        case BenchmarkMetric.ACCOUNTS_PER_DAY:
          value = calculateAccountsTouched(
            user.id,
            dateRange,
            activities as WorkActivity[]
          ).count / 5;
          break;
        case BenchmarkMetric.CLAIMS_PER_HOUR:
          const claims = calculateClaimsProcessed(
            user.id,
            dateRange,
            activities as WorkActivity[]
          ).count;
          const timeEntries = await this.getTimeEntries(user.id, dateRange);
          const hours = calculateProductiveTime(
            user.id,
            dateRange,
            timeEntries as TimeEntry[]
          ).totalHours;
          value = hours > 0 ? claims / hours : 0;
          break;
        default:
          value = 0;
      }

      if (value > 0) {
        teamValues.push({
          userId: user.id,
          userName: user.name || undefined,
          value,
        });
      }
    }

    return identifyTopPerformers(
      metric,
      teamValues,
      limit,
      StaffRole.BILLER,
      dateRange
    );
  }

  /**
   * Get benchmarks for comparison
   */
  async getBenchmarks(role: StaffRole): Promise<Record<BenchmarkMetric, {
    target: number;
    minimum: number;
    excellent: number;
    unit: string;
  }>> {
    const { ROLE_BENCHMARKS } = await import('@halcyon-rcm/core');
    const roleBenchmarks = ROLE_BENCHMARKS[role];

    const result: Record<string, { target: number; minimum: number; excellent: number; unit: string }> = {};

    for (const [metric, value] of Object.entries(roleBenchmarks.benchmarks)) {
      if (value.target > 0) {
        result[metric] = {
          target: value.target,
          minimum: value.minimum,
          excellent: value.excellent,
          unit: value.unit,
        };
      }
    }

    return result as Record<BenchmarkMetric, { target: number; minimum: number; excellent: number; unit: string }>;
  }
}

export const productivityService = new ProductivityService();
