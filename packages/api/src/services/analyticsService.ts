// @ts-nocheck
/**
 * Analytics Service
 *
 * Business logic for predictive analytics including denial prediction,
 * collection prioritization, revenue forecasting, and KPI tracking.
 */

import { prisma } from '../lib/prisma.js';
import {
  // Denial prediction
  predictDenialRisk,
  batchPredictDenialRisk,
  trainDenialModel,
  getDenialModelStats,
  ClaimForPrediction,
  DenialPrediction,
  HistoricalClaimData,

  // Collection prediction
  predictCollectionLikelihood,
  segmentAccounts,
  AccountForPrediction,
  CollectionPrediction,
  CollectionFactors,
  SegmentationResult,

  // Revenue forecasting
  forecastRevenue,
  calculateSeasonality,
  projectCashFlow,
  scenarioAnalysis,
  DateRange,
  RevenueForecast,
  SeasonalityAnalysis,
  CashFlowProjection,
  CashFlowAccount,
  ScenarioAssumption,
  ScenarioAnalysis,
  HistoricalDataPoint,

  // KPI calculation
  generateKPIDashboard,
  getIndustryBenchmarks,
  ClaimForKPI,
  AccountForKPI,
  CostData,
  KPIDashboard,
  KPIResult,

  // Types from collections
  CollectionState,
  InsuranceStatus,
  PaymentHistoryRating,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface DenialPredictionParams {
  claimId: string;
  organizationId?: string;
}

export interface BatchDenialPredictionParams {
  claimIds: string[];
  organizationId?: string;
}

export interface CollectionPrioritizationParams {
  organizationId?: string;
  limit?: number;
  minBalance?: number;
  states?: string[];
}

export interface RevenueForecastParams {
  startDate: string;
  endDate: string;
  baseMonthlyRevenue: number;
  organizationId?: string;
  filters?: {
    payerTypes?: string[];
    serviceTypes?: string[];
  };
}

export interface KPIDashboardParams {
  startDate: string;
  endDate: string;
  organizationId?: string;
  compareToPriorPeriod?: boolean;
}

export interface KPITrendParams {
  kpiName: string;
  startDate: string;
  endDate: string;
  organizationId?: string;
  granularity?: 'DAY' | 'WEEK' | 'MONTH';
}

export interface ExportParams {
  type: 'denial_predictions' | 'collection_prioritization' | 'kpi_dashboard' | 'revenue_forecast';
  startDate: string;
  endDate: string;
  organizationId?: string;
  format?: 'csv' | 'json';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AnalyticsService {
  // ==========================================================================
  // DENIAL PREDICTION
  // ==========================================================================

  /**
   * Get denial prediction for a single claim
   */
  async getDenialPrediction(params: DenialPredictionParams): Promise<DenialPrediction> {
    const { claimId, organizationId } = params;

    // Fetch claim data
    const claim = await prisma.claimSubmission.findFirst({
      where: {
        claimId,
        ...(organizationId ? { /* organization filter if available */ } : {}),
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // Transform to prediction input
    const claimInput = this.transformClaimForPrediction(claim);

    // Get prediction
    const prediction = predictDenialRisk(claimInput);

    // Log prediction
    await this.logPrediction('DENIAL', claimId, claimInput, prediction);

    return prediction;
  }

  /**
   * Batch denial prediction for multiple claims
   */
  async batchDenialPrediction(params: BatchDenialPredictionParams): Promise<DenialPrediction[]> {
    const { claimIds, organizationId } = params;

    // Fetch claims
    const claims = await prisma.claimSubmission.findMany({
      where: {
        claimId: { in: claimIds },
      },
    });

    // Transform claims
    const claimInputs = claims.map(c => this.transformClaimForPrediction(c));

    // Get predictions
    const predictions = batchPredictDenialRisk(claimInputs);

    // Log predictions
    for (let i = 0; i < predictions.length; i++) {
      await this.logPrediction('DENIAL', claimInputs[i].claimId, claimInputs[i], predictions[i]);
    }

    return predictions;
  }

  /**
   * Train denial prediction model with historical data
   */
  async trainDenialPredictionModel(organizationId?: string): Promise<{
    success: boolean;
    sampleCount: number;
    payerPatterns: number;
    cptPatterns: number;
  }> {
    // Fetch historical claim data
    const historicalClaims = await prisma.claim.findMany({
      where: {
        status: { in: ['PAID', 'DENIED'] },
        submittedDate: { not: null },
      },
      take: 10000, // Limit for performance
      orderBy: { createdAt: 'desc' },
    });

    // Transform to training data
    const trainingData: HistoricalClaimData[] = historicalClaims.map(claim => ({
      claimId: claim.id,
      payerId: claim.payerType,
      cptCodes: [], // Would need to join with service lines
      diagnosisCodes: [],
      chargeAmount: Number(claim.billedAmount),
      authStatus: 'OBTAINED',
      wasdenied: claim.status === 'DENIED',
      denialCategory: claim.denialCode ? this.mapDenialCategory(claim.denialCode) : undefined,
      denialCarcCode: claim.denialCode || undefined,
    }));

    // Train model
    const result = trainDenialModel(trainingData);

    return result;
  }

  // ==========================================================================
  // COLLECTION PRIORITIZATION
  // ==========================================================================

  /**
   * Get prioritized collection list
   */
  async getCollectionPrioritization(params: CollectionPrioritizationParams): Promise<{
    accounts: Array<CollectionPrediction & { accountDetails: any }>;
    segmentation: SegmentationResult;
  }> {
    const { organizationId, limit = 100, minBalance = 25, states } = params;

    // Build query filters
    const where: any = {
      balance: { gte: minBalance },
    };

    if (states && states.length > 0) {
      where.state = { in: states };
    }

    if (organizationId) {
      where.patient = {
        assessment: { organizationId },
      };
    }

    // Fetch collection accounts
    const accounts = await prisma.collectionAccount.findMany({
      where,
      include: {
        patient: true,
        actions: {
          where: { action: 'APPLY_PAYMENT' },
          take: 5,
        },
        promisesToPay: {
          where: { status: { not: 'FULFILLED' } },
        },
      },
      take: limit,
      orderBy: { balance: 'desc' },
    });

    // Transform to prediction input
    const accountInputs: AccountForPrediction[] = accounts.map(account =>
      this.transformAccountForPrediction(account)
    );

    // Get predictions and segmentation
    const predictions = accountInputs.map(input => ({
      ...predictCollectionLikelihood(input),
      accountDetails: accounts.find(a => a.id === input.accountId),
    }));

    const segmentation = segmentAccounts(accountInputs);

    // Sort by expected collection (descending)
    predictions.sort((a, b) => b.expectedCollection - a.expectedCollection);

    return {
      accounts: predictions,
      segmentation,
    };
  }

  // ==========================================================================
  // REVENUE FORECASTING
  // ==========================================================================

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(params: RevenueForecastParams): Promise<RevenueForecast> {
    const { startDate, endDate, baseMonthlyRevenue, organizationId, filters } = params;

    const dateRange: DateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Generate forecast
    const forecast = forecastRevenue(dateRange, baseMonthlyRevenue, filters);

    return forecast;
  }

  /**
   * Calculate seasonality from historical data
   */
  async calculateHistoricalSeasonality(
    organizationId?: string,
    months: number = 24
  ): Promise<SeasonalityAnalysis> {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Fetch historical payment data
    const payments = await prisma.payment.findMany({
      where: {
        postedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        postedAt: true,
      },
      orderBy: { postedAt: 'asc' },
    });

    // Aggregate by month
    const monthlyData: Map<string, { total: number; count: number }> = new Map();

    for (const payment of payments) {
      const monthKey = `${payment.postedAt.getFullYear()}-${String(payment.postedAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { total: 0, count: 0 };
      existing.total += Number(payment.amount);
      existing.count++;
      monthlyData.set(monthKey, existing);
    }

    // Transform to historical data points
    const historicalData: HistoricalDataPoint[] = Array.from(monthlyData.entries()).map(([key, data]) => ({
      date: new Date(key + '-01'),
      periodType: 'MONTH' as const,
      claimCount: data.count,
      chargedAmount: 0,
      paidAmount: data.total,
      collectionRate: 0,
      averageDaysToPay: 0,
    }));

    // Calculate seasonality
    return calculateSeasonality(historicalData);
  }

  /**
   * Project cash flow from current A/R
   */
  async projectCashFlowFromAR(
    dateRange: DateRange,
    organizationId?: string
  ): Promise<CashFlowProjection> {
    // Fetch collection accounts
    const accounts = await prisma.collectionAccount.findMany({
      where: {
        balance: { gt: 0 },
        state: { notIn: ['PAID', 'WRITTEN_OFF'] },
        ...(organizationId ? {
          patient: { assessment: { organizationId } },
        } : {}),
      },
      include: {
        patient: true,
      },
    });

    // Transform and predict collection likelihood
    const cashFlowAccounts: CashFlowAccount[] = accounts.map(account => {
      const input = this.transformAccountForPrediction(account);
      const prediction = predictCollectionLikelihood(input);

      return {
        accountId: account.id,
        balance: Number(account.balance),
        daysPastDue: this.calculateDaysPastDue(account.dueDate),
        collectionLikelihood: prediction.likelihoodScore,
        expectedDaysToPayment: prediction.estimatedDaysToPayment,
        expectedCollection: prediction.expectedCollection,
      };
    });

    // Project cash flow
    return projectCashFlow(cashFlowAccounts, dateRange);
  }

  /**
   * Run scenario analysis
   */
  async runScenarioAnalysis(
    baseForecast: number,
    assumptions: ScenarioAssumption[]
  ): Promise<ScenarioAnalysis> {
    return scenarioAnalysis(baseForecast, assumptions);
  }

  // ==========================================================================
  // KPI DASHBOARD
  // ==========================================================================

  /**
   * Get KPI dashboard
   */
  async getKPIDashboard(params: KPIDashboardParams): Promise<KPIDashboard> {
    const { startDate, endDate, organizationId, compareToPriorPeriod } = params;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch claims for KPI calculation
    const claims = await prisma.claim.findMany({
      where: {
        submittedDate: { gte: start, lte: end },
      },
    });

    // Fetch accounts for KPI calculation
    const accounts = await prisma.collectionAccount.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });

    // Transform data
    const claimsForKPI: ClaimForKPI[] = claims.map(this.transformClaimForKPI);
    const accountsForKPI: AccountForKPI[] = accounts.map(this.transformAccountForKPI);

    // Get cost data (simplified - would come from actual cost tracking)
    const costs: CostData = {
      totalRevenue: accountsForKPI.reduce((sum, a) => sum + a.totalPaid, 0),
      totalCosts: 0, // Would be calculated from actual cost data
    };

    // Get prior period KPIs if requested
    let priorPeriodKPIs: Partial<Record<string, number>> | undefined;
    if (compareToPriorPeriod) {
      priorPeriodKPIs = await this.getPriorPeriodKPIs(start, end, organizationId);
    }

    // Generate dashboard
    const dashboard = generateKPIDashboard(
      claimsForKPI,
      accountsForKPI,
      costs,
      { startDate: start, endDate: end },
      priorPeriodKPIs
    );

    // Save KPI snapshot
    await this.saveKPISnapshot(dashboard);

    return dashboard;
  }

  /**
   * Get KPI trend over time
   */
  async getKPITrends(params: KPITrendParams): Promise<{
    kpiName: string;
    dataPoints: Array<{ date: Date; value: number }>;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    averageValue: number;
  }> {
    const { kpiName, startDate, endDate, organizationId, granularity = 'MONTH' } = params;

    // Fetch KPI snapshots
    const snapshots = await prisma.kPISnapshot.findMany({
      where: {
        kpiName,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });

    const dataPoints = snapshots.map(s => ({
      date: s.date,
      value: Number(s.value),
    }));

    // Calculate trend
    let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
    if (dataPoints.length >= 2) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
      const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length;
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      if (changePercent > 5) trend = 'INCREASING';
      else if (changePercent < -5) trend = 'DECREASING';
    }

    const averageValue = dataPoints.length > 0
      ? dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length
      : 0;

    return {
      kpiName,
      dataPoints,
      trend,
      averageValue: Math.round(averageValue * 100) / 100,
    };
  }

  /**
   * Get industry benchmarks
   */
  getBenchmarks(): ReturnType<typeof getIndustryBenchmarks> {
    return getIndustryBenchmarks();
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export analytics data
   */
  async exportAnalytics(params: ExportParams): Promise<{
    data: any[];
    format: string;
    filename: string;
  }> {
    const { type, startDate, endDate, organizationId, format = 'csv' } = params;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'denial_predictions': {
        const claims = await prisma.claimSubmission.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          take: 1000,
        });
        const predictions = batchPredictDenialRisk(
          claims.map(c => this.transformClaimForPrediction(c))
        );
        data = predictions.map(p => ({
          claimId: p.claimId,
          riskScore: p.riskScore,
          riskLevel: p.riskLevel,
          denialProbability: p.denialProbability,
          topReason: p.likelyReasons[0]?.description || 'N/A',
          topAction: p.preventionActions[0]?.action || 'N/A',
        }));
        filename = `denial_predictions_${startDate}_${endDate}`;
        break;
      }

      case 'collection_prioritization': {
        const result = await this.getCollectionPrioritization({
          organizationId,
          limit: 1000,
        });
        data = result.accounts.map(a => ({
          accountId: a.accountId,
          balance: a.accountDetails?.balance,
          likelihoodScore: a.likelihoodScore,
          likelihoodClass: a.likelihoodClass,
          expectedCollection: a.expectedCollection,
          recommendedStrategy: a.recommendedStrategy,
        }));
        filename = `collection_prioritization_${startDate}_${endDate}`;
        break;
      }

      case 'kpi_dashboard': {
        const dashboard = await this.getKPIDashboard({
          startDate,
          endDate,
          organizationId,
        });
        data = [
          { kpi: 'Days in A/R', value: dashboard.daysInAR.value, benchmark: dashboard.daysInAR.benchmark?.value },
          { kpi: 'Clean Claim Rate', value: dashboard.cleanClaimRate.value, benchmark: dashboard.cleanClaimRate.benchmark?.value },
          { kpi: 'Denial Rate', value: dashboard.denialRate.value, benchmark: dashboard.denialRate.benchmark?.value },
          { kpi: 'Collection Rate', value: dashboard.collectionRate.value, benchmark: dashboard.collectionRate.benchmark?.value },
          { kpi: 'First Pass Yield', value: dashboard.firstPassYield.value, benchmark: dashboard.firstPassYield.benchmark?.value },
          { kpi: 'Cost to Collect', value: dashboard.costToCollect.value, benchmark: dashboard.costToCollect.benchmark?.value },
        ];
        filename = `kpi_dashboard_${startDate}_${endDate}`;
        break;
      }

      case 'revenue_forecast': {
        const forecast = await this.getRevenueForecast({
          startDate,
          endDate,
          baseMonthlyRevenue: 100000, // Default - should be parameterized
        });
        data = forecast.periods.map(p => ({
          period: p.label,
          forecast: p.forecast,
          lowerBound: p.lowerBound,
          upperBound: p.upperBound,
          seasonalityFactor: p.seasonalityFactor,
        }));
        filename = `revenue_forecast_${startDate}_${endDate}`;
        break;
      }
    }

    return {
      data,
      format,
      filename: `${filename}.${format}`,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Transform claim submission to prediction input
   */
  private transformClaimForPrediction(claim: any): ClaimForPrediction {
    return {
      claimId: claim.claimId || claim.id,
      payerId: claim.payerId,
      payerName: claim.payerName,
      cptCodes: [], // Would need to parse from X12 content
      diagnosisCodes: [],
      chargeAmount: Number(claim.totalChargeAmount || 0),
      serviceDate: claim.createdAt,
      authStatus: 'NOT_REQUIRED',
      isResubmission: !!claim.originalClaimId,
    };
  }

  /**
   * Transform collection account to prediction input
   */
  private transformAccountForPrediction(account: any): AccountForPrediction {
    const dueDate = account.dueDate || account.createdAt;
    const daysPastDue = this.calculateDaysPastDue(dueDate);
    const ageDays = Math.floor(
      (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const paymentCount = account.actions?.length || 0;
    const brokenPromises = account.promisesToPay?.filter((p: any) => p.status === 'BROKEN').length || 0;

    const factors: CollectionFactors = {
      balance: Number(account.balance),
      originalAmount: Number(account.originalAmount || account.balance),
      ageDays,
      daysPastDue,
      paymentHistory: this.getPaymentHistoryRating(paymentCount, brokenPromises),
      previousPaymentCount: paymentCount,
      previousPaymentTotal: 0,
      insurance: (account.insuranceStatus as InsuranceStatus) || 'UNINSURED',
      hasValidPhone: !!account.patient?.phone,
      hasValidEmail: !!account.patient?.email,
      hasRespondedToContact: false,
      contactAttemptCount: 0,
      brokenPromiseCount: brokenPromises,
      returnedPaymentCount: 0,
      hasActiveDispute: account.hasActiveDispute || false,
      isOnHardship: account.hasHardship || false,
      collectionState: account.state as CollectionState,
    };

    return {
      accountId: account.id,
      patientId: account.patientId,
      factors,
    };
  }

  /**
   * Transform claim for KPI calculation
   */
  private transformClaimForKPI(claim: any): ClaimForKPI {
    return {
      claimId: claim.id,
      status: claim.status,
      billedAmount: Number(claim.billedAmount),
      allowedAmount: claim.allowedAmount ? Number(claim.allowedAmount) : undefined,
      paidAmount: claim.paidAmount ? Number(claim.paidAmount) : undefined,
      serviceDate: claim.submittedDate || claim.createdAt,
      submissionDate: claim.submittedDate,
      paymentDate: undefined, // Would need to join with payments
      wasDenied: claim.status === 'DENIED',
      paidFirstPass: claim.status === 'PAID' && !claim.denialCode,
    };
  }

  /**
   * Transform account for KPI calculation
   */
  private transformAccountForKPI(account: any): AccountForKPI {
    return {
      accountId: account.id,
      originalBalance: Number(account.originalAmount || account.balance),
      currentBalance: Number(account.balance),
      totalPaid: Number(account.originalAmount || 0) - Number(account.balance),
      totalAdjustments: Number(account.adjustments || 0),
      ageDays: Math.floor(
        (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      isPaidInFull: account.state === 'PAID',
      isWrittenOff: account.state === 'WRITTEN_OFF',
    };
  }

  /**
   * Calculate days past due
   */
  private calculateDaysPastDue(dueDate: Date | string | null): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const diff = Date.now() - due.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Get payment history rating
   */
  private getPaymentHistoryRating(paymentCount: number, brokenPromises: number): PaymentHistoryRating {
    if (paymentCount === 0 && brokenPromises === 0) return 'NO_HISTORY';
    if (brokenPromises >= 3) return 'POOR';
    if (brokenPromises >= 1) return 'FAIR';
    if (paymentCount >= 3) return 'EXCELLENT';
    if (paymentCount >= 1) return 'GOOD';
    return 'FAIR';
  }

  /**
   * Map denial code to category
   */
  private mapDenialCategory(code: string): any {
    // Simplified mapping - would use full CARC code database
    if (code.startsWith('1') || code.startsWith('2')) return 'ELIGIBILITY';
    if (code.startsWith('3') || code.startsWith('4')) return 'CODING';
    if (code === '29') return 'TIMELY_FILING';
    if (code === '18') return 'DUPLICATE';
    return 'OTHER';
  }

  /**
   * Log prediction for tracking
   */
  private async logPrediction(
    type: string,
    entityId: string,
    input: any,
    prediction: any
  ): Promise<void> {
    try {
      await prisma.predictionLog.create({
        data: {
          type,
          inputData: input,
          prediction,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Log but don't fail on prediction logging errors
      console.error('Failed to log prediction:', error);
    }
  }

  /**
   * Save KPI snapshot
   */
  private async saveKPISnapshot(dashboard: KPIDashboard): Promise<void> {
    const snapshots = [
      { kpiName: 'daysInAR', value: dashboard.daysInAR.value },
      { kpiName: 'cleanClaimRate', value: dashboard.cleanClaimRate.value },
      { kpiName: 'denialRate', value: dashboard.denialRate.value },
      { kpiName: 'collectionRate', value: dashboard.collectionRate.value },
      { kpiName: 'firstPassYield', value: dashboard.firstPassYield.value },
      { kpiName: 'costToCollect', value: dashboard.costToCollect.value },
      { kpiName: 'netCollectionRate', value: dashboard.netCollectionRate.value },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const snapshot of snapshots) {
      try {
        await prisma.kPISnapshot.upsert({
          where: {
            date_kpiName: {
              date: today,
              kpiName: snapshot.kpiName,
            },
          },
          update: {
            value: snapshot.value,
          },
          create: {
            date: today,
            kpiName: snapshot.kpiName,
            value: snapshot.value,
          },
        });
      } catch (error) {
        console.error(`Failed to save KPI snapshot for ${snapshot.kpiName}:`, error);
      }
    }
  }

  /**
   * Get prior period KPIs
   */
  private async getPriorPeriodKPIs(
    currentStart: Date,
    currentEnd: Date,
    organizationId?: string
  ): Promise<Partial<Record<string, number>>> {
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const priorEnd = new Date(currentStart.getTime() - 1);
    const priorStart = new Date(priorEnd.getTime() - periodLength);

    const snapshots = await prisma.kPISnapshot.findMany({
      where: {
        date: {
          gte: priorStart,
          lte: priorEnd,
        },
      },
    });

    const result: Partial<Record<string, number>> = {};
    for (const snapshot of snapshots) {
      result[snapshot.kpiName] = Number(snapshot.value);
    }

    return result;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
