// @ts-nocheck
/**
 * Report Controller
 * Business logic for generating analytics and reports
 * Uses Prisma aggregations for efficient database queries
 */

import { prisma } from '../lib/prisma.js';
import { buildAssessmentFilters } from '../lib/db-helpers.js';
import type { AssessmentFilters } from '../lib/db-helpers.js';
import type { HospitalRecoveryResult } from '@halcyon-rcm/core';

// Types for report data
export interface SummaryReport {
  totalAssessments: number;
  totalRecoveryOpportunity: number;
  totalCurrentExposure: number;
  averageConfidence: number;
  averageRecoveryPerCase: number;
  conversionRate: number; // Percentage of cases with recovery > 0
  topPathways: Array<{
    pathway: string;
    count: number;
    totalRecovery: number;
    percentage: number;
  }>;
  byConfidenceTier: {
    high: { count: number; recovery: number }; // 70-100
    medium: { count: number; recovery: number }; // 40-69
    low: { count: number; recovery: number }; // 0-39
  };
  recentTrend: {
    last7Days: { count: number; recovery: number };
    last30Days: { count: number; recovery: number };
    last90Days: { count: number; recovery: number };
  };
}

export interface PathwayBreakdownReport {
  pathways: Array<{
    pathway: string;
    count: number;
    totalRecovery: number;
    averageRecovery: number;
    averageConfidence: number;
    percentageOfTotal: number;
    topStates: Array<{ state: string; count: number }>;
  }>;
  totalAssessments: number;
  totalRecovery: number;
}

export interface StateBreakdownReport {
  states: Array<{
    state: string;
    count: number;
    totalRecovery: number;
    averageRecovery: number;
    averageConfidence: number;
    percentageOfTotal: number;
    topPathways: Array<{ pathway: string; count: number }>;
  }>;
  totalAssessments: number;
  totalRecovery: number;
}

export interface UrgencyBreakdownReport {
  urgencyLevels: Array<{
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    criteria: string;
    count: number;
    totalRecovery: number;
    averageRecovery: number;
    percentageOfTotal: number;
    topActions: string[];
  }>;
  totalAssessments: number;
  totalRecovery: number;
  actionableCount: number;
}

export interface TrendReport {
  timeRange: {
    start: string;
    end: string;
    granularity: 'day' | 'week' | 'month';
  };
  dataPoints: Array<{
    date: string;
    assessmentCount: number;
    totalRecovery: number;
    averageConfidence: number;
    topPathway: string;
  }>;
  aggregates: {
    totalAssessments: number;
    totalRecovery: number;
    averageRecoveryPerDay: number;
    growthRate: number;
  };
  pathwayTrends: Record<string, Array<{ date: string; count: number; recovery: number }>>;
}

export class ReportController {
  /**
   * Get overall recovery opportunity summary
   */
  async getSummary(filters?: AssessmentFilters): Promise<SummaryReport> {
    const where = filters ? buildAssessmentFilters(filters) : {};

    // Get aggregate stats
    const stats = await prisma.assessment.aggregate({
      where,
      _count: true,
      _sum: {
        estimatedTotalRecovery: true,
        currentExposure: true,
      },
      _avg: {
        overallConfidence: true,
        estimatedTotalRecovery: true,
      },
    });

    if (stats._count === 0) {
      return this.emptySummary();
    }

    const totalRecovery = stats._sum.estimatedTotalRecovery?.toNumber() || 0;
    const totalExposure = stats._sum.currentExposure?.toNumber() || 0;

    // Get pathway breakdown
    const pathwayGroups = await prisma.assessment.groupBy({
      by: ['primaryRecoveryPath'],
      where,
      _count: true,
      _sum: {
        estimatedTotalRecovery: true,
      },
      orderBy: {
        _sum: {
          estimatedTotalRecovery: 'desc',
        },
      },
      take: 5,
    });

    const topPathways = pathwayGroups.map((g) => ({
      pathway: g.primaryRecoveryPath,
      count: g._count,
      totalRecovery: g._sum.estimatedTotalRecovery?.toNumber() || 0,
      percentage: Math.round((g._count / stats._count) * 100),
    }));

    // Get confidence tier breakdown
    const [highConfidence, mediumConfidence, lowConfidence] = await Promise.all([
      prisma.assessment.aggregate({
        where: { ...where, overallConfidence: { gte: 70 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
      prisma.assessment.aggregate({
        where: { ...where, overallConfidence: { gte: 40, lt: 70 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
      prisma.assessment.aggregate({
        where: { ...where, overallConfidence: { lt: 40 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
    ]);

    // Get recent trends
    const now = new Date();
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [trend7, trend30, trend90] = await Promise.all([
      prisma.assessment.aggregate({
        where: { ...where, createdAt: { gte: days7 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
      prisma.assessment.aggregate({
        where: { ...where, createdAt: { gte: days30 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
      prisma.assessment.aggregate({
        where: { ...where, createdAt: { gte: days90 } },
        _count: true,
        _sum: { estimatedTotalRecovery: true },
      }),
    ]);

    // Get conversion rate (cases with recovery > 0)
    const casesWithRecovery = await prisma.assessment.count({
      where: { ...where, estimatedTotalRecovery: { gt: 0 } },
    });

    return {
      totalAssessments: stats._count,
      totalRecoveryOpportunity: totalRecovery,
      totalCurrentExposure: totalExposure,
      averageConfidence: Math.round(stats._avg.overallConfidence || 0),
      averageRecoveryPerCase: Math.round(stats._avg.estimatedTotalRecovery?.toNumber() || 0),
      conversionRate: Math.round((casesWithRecovery / stats._count) * 100),
      topPathways,
      byConfidenceTier: {
        high: {
          count: highConfidence._count,
          recovery: highConfidence._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
        medium: {
          count: mediumConfidence._count,
          recovery: mediumConfidence._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
        low: {
          count: lowConfidence._count,
          recovery: lowConfidence._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
      },
      recentTrend: {
        last7Days: {
          count: trend7._count,
          recovery: trend7._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
        last30Days: {
          count: trend30._count,
          recovery: trend30._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
        last90Days: {
          count: trend90._count,
          recovery: trend90._sum.estimatedTotalRecovery?.toNumber() || 0,
        },
      },
    };
  }

  /**
   * Get breakdown by recovery pathway
   */
  async getByPathway(filters?: AssessmentFilters): Promise<PathwayBreakdownReport> {
    const where = filters ? buildAssessmentFilters(filters) : {};

    // Get total stats
    const totalStats = await prisma.assessment.aggregate({
      where,
      _count: true,
      _sum: { estimatedTotalRecovery: true },
    });

    const totalRecovery = totalStats._sum.estimatedTotalRecovery?.toNumber() || 0;

    // Get pathway groups with stats
    const pathwayGroups = await prisma.assessment.groupBy({
      by: ['primaryRecoveryPath'],
      where,
      _count: true,
      _sum: { estimatedTotalRecovery: true },
      _avg: {
        estimatedTotalRecovery: true,
        overallConfidence: true,
      },
      orderBy: {
        _sum: { estimatedTotalRecovery: 'desc' },
      },
    });

    // For each pathway, get top states
    const pathways = await Promise.all(
      pathwayGroups.map(async (pg) => {
        const stateGroups = await prisma.assessment.groupBy({
          by: ['stateOfService'],
          where: { ...where, primaryRecoveryPath: pg.primaryRecoveryPath },
          _count: true,
          orderBy: { _count: 'desc' },
          take: 3,
        });

        const pathwayRecovery = pg._sum.estimatedTotalRecovery?.toNumber() || 0;

        return {
          pathway: pg.primaryRecoveryPath,
          count: pg._count,
          totalRecovery: pathwayRecovery,
          averageRecovery: Math.round(pg._avg.estimatedTotalRecovery?.toNumber() || 0),
          averageConfidence: Math.round(pg._avg.overallConfidence || 0),
          percentageOfTotal: totalRecovery > 0 ? Math.round((pathwayRecovery / totalRecovery) * 100) : 0,
          topStates: stateGroups.map((sg) => ({
            state: sg.stateOfService,
            count: sg._count,
          })),
        };
      })
    );

    return {
      pathways,
      totalAssessments: totalStats._count,
      totalRecovery,
    };
  }

  /**
   * Get breakdown by state
   */
  async getByState(filters?: AssessmentFilters): Promise<StateBreakdownReport> {
    const where = filters ? buildAssessmentFilters(filters) : {};

    // Get total stats
    const totalStats = await prisma.assessment.aggregate({
      where,
      _count: true,
      _sum: { estimatedTotalRecovery: true },
    });

    const totalRecovery = totalStats._sum.estimatedTotalRecovery?.toNumber() || 0;

    // Get state groups with stats
    const stateGroups = await prisma.assessment.groupBy({
      by: ['stateOfService'],
      where,
      _count: true,
      _sum: { estimatedTotalRecovery: true },
      _avg: {
        estimatedTotalRecovery: true,
        overallConfidence: true,
      },
      orderBy: {
        _sum: { estimatedTotalRecovery: 'desc' },
      },
    });

    // For each state, get top pathways
    const states = await Promise.all(
      stateGroups.map(async (sg) => {
        const pathwayGroups = await prisma.assessment.groupBy({
          by: ['primaryRecoveryPath'],
          where: { ...where, stateOfService: sg.stateOfService },
          _count: true,
          orderBy: { _count: 'desc' },
          take: 3,
        });

        const stateRecovery = sg._sum.estimatedTotalRecovery?.toNumber() || 0;

        return {
          state: sg.stateOfService,
          count: sg._count,
          totalRecovery: stateRecovery,
          averageRecovery: Math.round(sg._avg.estimatedTotalRecovery?.toNumber() || 0),
          averageConfidence: Math.round(sg._avg.overallConfidence || 0),
          percentageOfTotal: totalRecovery > 0 ? Math.round((stateRecovery / totalRecovery) * 100) : 0,
          topPathways: pathwayGroups.map((pg) => ({
            pathway: pg.primaryRecoveryPath,
            count: pg._count,
          })),
        };
      })
    );

    return {
      states,
      totalAssessments: totalStats._count,
      totalRecovery,
    };
  }

  /**
   * Get breakdown by urgency level
   * Note: This requires fetching assessment data to calculate urgency scores
   */
  async getByUrgency(filters?: AssessmentFilters): Promise<UrgencyBreakdownReport> {
    const where = filters ? buildAssessmentFilters(filters) : {};

    // Fetch assessments with result data for urgency calculation
    const assessments = await prisma.assessment.findMany({
      where,
      select: {
        id: true,
        overallConfidence: true,
        estimatedTotalRecovery: true,
        result: true,
        createdAt: true,
      },
      take: 10000,
    });

    const totalRecovery = assessments.reduce(
      (sum, a) => sum + (a.estimatedTotalRecovery?.toNumber() || 0),
      0
    );

    // Categorize by urgency
    const getUrgency = (a: any): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
      const recovery = a.estimatedTotalRecovery?.toNumber() || 0;
      const confidence = a.overallConfidence || 0;
      const score = recovery * (confidence / 100);

      // Get date of service from result
      const result = a.result as HospitalRecoveryResult | null;
      const dateOfService = result?.medicaid?.pathway?.includes('retroactive')
        ? new Date() // Assume recent for retroactive
        : new Date(a.createdAt);
      const daysSince = Math.floor((Date.now() - dateOfService.getTime()) / (1000 * 60 * 60 * 24));

      if (score >= 10000 && confidence >= 80 && daysSince <= 30) {
        return 'CRITICAL';
      }
      if (score >= 5000 && confidence >= 60) {
        return 'HIGH';
      }
      if (score >= 1000 && confidence >= 40) {
        return 'MEDIUM';
      }
      return 'LOW';
    };

    // Group by urgency
    const urgencyGroups: Record<string, typeof assessments> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };

    for (const assessment of assessments) {
      const urgency = getUrgency(assessment);
      urgencyGroups[urgency].push(assessment);
    }

    const urgencyLevels: UrgencyBreakdownReport['urgencyLevels'] = [
      {
        level: 'CRITICAL' as const,
        criteria: 'Recovery score >= $10K, Confidence >= 80%, Within 30 days',
        count: 0,
        totalRecovery: 0,
        averageRecovery: 0,
        percentageOfTotal: 0,
        topActions: [],
      },
      {
        level: 'HIGH' as const,
        criteria: 'Recovery score >= $5K, Confidence >= 60%',
        count: 0,
        totalRecovery: 0,
        averageRecovery: 0,
        percentageOfTotal: 0,
        topActions: [],
      },
      {
        level: 'MEDIUM' as const,
        criteria: 'Recovery score >= $1K, Confidence >= 40%',
        count: 0,
        totalRecovery: 0,
        averageRecovery: 0,
        percentageOfTotal: 0,
        topActions: [],
      },
      {
        level: 'LOW' as const,
        criteria: 'Other cases',
        count: 0,
        totalRecovery: 0,
        averageRecovery: 0,
        percentageOfTotal: 0,
        topActions: [],
      },
    ];

    for (const urgencyLevel of urgencyLevels) {
      const items = urgencyGroups[urgencyLevel.level] || [];
      urgencyLevel.count = items.length;
      urgencyLevel.totalRecovery = items.reduce(
        (sum, a) => sum + (a.estimatedTotalRecovery?.toNumber() || 0),
        0
      );
      urgencyLevel.averageRecovery = items.length > 0
        ? Math.round(urgencyLevel.totalRecovery / items.length)
        : 0;
      urgencyLevel.percentageOfTotal = totalRecovery > 0
        ? Math.round((urgencyLevel.totalRecovery / totalRecovery) * 100)
        : 0;

      // Get top actions for this urgency level
      const actionCounts: Record<string, number> = {};
      for (const item of items) {
        const result = item.result as HospitalRecoveryResult | null;
        if (result?.immediateActions) {
          for (const action of result.immediateActions) {
            actionCounts[action] = (actionCounts[action] || 0) + 1;
          }
        }
      }
      urgencyLevel.topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action]) => action);
    }

    // Count actionable cases
    const actionableCount = assessments.filter((a) => {
      const result = a.result as HospitalRecoveryResult | null;
      return result?.immediateActions && result.immediateActions.length > 0;
    }).length;

    return {
      urgencyLevels,
      totalAssessments: assessments.length,
      totalRecovery,
      actionableCount,
    };
  }

  /**
   * Get recovery trends over time
   */
  async getTrends(options: {
    startDate?: string;
    endDate?: string;
    granularity?: 'day' | 'week' | 'month';
    filters?: AssessmentFilters;
  } = {}): Promise<TrendReport> {
    const granularity = options.granularity || 'day';
    const endDate = options.endDate ? new Date(options.endDate) : new Date();
    const startDate = options.startDate
      ? new Date(options.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere = options.filters ? buildAssessmentFilters(options.filters) : {};
    const where = {
      ...baseWhere,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Get assessments within date range
    const assessments = await prisma.assessment.findMany({
      where,
      select: {
        id: true,
        primaryRecoveryPath: true,
        overallConfidence: true,
        estimatedTotalRecovery: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 10000,
    });

    // Generate date keys based on granularity
    const getDateKey = (date: Date): string => {
      switch (granularity) {
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        }
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'day':
        default:
          return date.toISOString().split('T')[0];
      }
    };

    // Group assessments by date
    const dateGroups: Record<string, typeof assessments> = {};
    for (const assessment of assessments) {
      const key = getDateKey(assessment.createdAt);
      if (!dateGroups[key]) {
        dateGroups[key] = [];
      }
      dateGroups[key].push(assessment);
    }

    // Generate all date keys in range
    const allDateKeys: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDateKeys.push(getDateKey(current));
      switch (granularity) {
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'day':
        default:
          current.setDate(current.getDate() + 1);
      }
    }

    // Build data points
    const dataPoints = allDateKeys.map((dateKey) => {
      const items = dateGroups[dateKey] || [];
      const totalRecovery = items.reduce(
        (sum, a) => sum + (a.estimatedTotalRecovery?.toNumber() || 0),
        0
      );
      const totalConfidence = items.reduce(
        (sum, a) => sum + (a.overallConfidence || 0),
        0
      );

      // Find top pathway
      const pathwayCounts: Record<string, number> = {};
      for (const item of items) {
        pathwayCounts[item.primaryRecoveryPath] = (pathwayCounts[item.primaryRecoveryPath] || 0) + 1;
      }
      const topPathway = Object.entries(pathwayCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        date: dateKey,
        assessmentCount: items.length,
        totalRecovery,
        averageConfidence: items.length > 0 ? Math.round(totalConfidence / items.length) : 0,
        topPathway,
      };
    });

    // Calculate pathway trends
    const allPathways = new Set(assessments.map((a) => a.primaryRecoveryPath));
    const pathwayTrends: Record<string, Array<{ date: string; count: number; recovery: number }>> = {};

    for (const pathway of allPathways) {
      pathwayTrends[pathway] = allDateKeys.map((dateKey) => {
        const items = (dateGroups[dateKey] || []).filter(
          (a) => a.primaryRecoveryPath === pathway
        );
        return {
          date: dateKey,
          count: items.length,
          recovery: items.reduce((sum, a) => sum + (a.estimatedTotalRecovery?.toNumber() || 0), 0),
        };
      });
    }

    // Calculate aggregates
    const totalRecovery = assessments.reduce(
      (sum, a) => sum + (a.estimatedTotalRecovery?.toNumber() || 0),
      0
    );
    const daysInRange = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate growth rate
    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
    const firstHalfTotal = firstHalf.reduce((sum, d) => sum + d.totalRecovery, 0);
    const secondHalfTotal = secondHalf.reduce((sum, d) => sum + d.totalRecovery, 0);
    const growthRate = firstHalfTotal > 0
      ? Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100)
      : 0;

    return {
      timeRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        granularity,
      },
      dataPoints,
      aggregates: {
        totalAssessments: assessments.length,
        totalRecovery,
        averageRecoveryPerDay: daysInRange > 0 ? Math.round(totalRecovery / daysInRange) : 0,
        growthRate,
      },
      pathwayTrends,
    };
  }

  private emptySummary(): SummaryReport {
    return {
      totalAssessments: 0,
      totalRecoveryOpportunity: 0,
      totalCurrentExposure: 0,
      averageConfidence: 0,
      averageRecoveryPerCase: 0,
      conversionRate: 0,
      topPathways: [],
      byConfidenceTier: {
        high: { count: 0, recovery: 0 },
        medium: { count: 0, recovery: 0 },
        low: { count: 0, recovery: 0 },
      },
      recentTrend: {
        last7Days: { count: 0, recovery: 0 },
        last30Days: { count: 0, recovery: 0 },
        last90Days: { count: 0, recovery: 0 },
      },
    };
  }
}

// Export singleton instance
export const reportController = new ReportController();
