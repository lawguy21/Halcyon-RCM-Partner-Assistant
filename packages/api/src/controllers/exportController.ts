// @ts-nocheck
/**
 * Export Controller
 * Business logic for data export operations
 */

import {
  exportToCSV as fileExchangeExportToCSV,
  exportWorklist as fileExchangeExportWorklist,
  exportExecutiveSummary as fileExchangeExportExecutiveSummary,
  formatCurrency,
  formatDate,
} from '@halcyon-rcm/file-exchange';
import { assessmentController } from './assessmentController.js';
import type { StoredAssessment, AssessmentFilters } from './assessmentController.js';

// Types for export options
export interface CSVExportOptions {
  filters?: AssessmentFilters;
  columns?: string[];
  includeInput?: boolean;
  includeFullResult?: boolean;
  filename?: string;
}

export interface WorklistExportOptions {
  filters?: AssessmentFilters;
  minRecovery?: number;
  minConfidence?: number;
  sortBy?: 'recovery' | 'confidence' | 'urgency';
  limit?: number;
}

export interface ExecutiveSummaryOptions {
  filters?: AssessmentFilters;
  title?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: 'state' | 'pathway' | 'encounterType';
}

export interface PDFExportOptions {
  assessmentId?: string;
  filters?: AssessmentFilters;
  template?: 'detailed' | 'summary' | 'worklist';
  title?: string;
  includeCharts?: boolean;
}

export interface ExecutiveSummaryPDFOptions {
  filters?: AssessmentFilters;
  title?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
}

export interface DetailedAssessmentPDFOptions {
  assessmentId: string;
  includeInput?: boolean;
  includePathwayDetails?: boolean;
  includeActions?: boolean;
}

export interface WorklistPDFOptions {
  assessmentIds?: string[];
  filters?: AssessmentFilters;
  minRecovery?: number;
  minConfidence?: number;
  sortBy?: 'recovery' | 'confidence' | 'urgency';
  limit?: number;
}

export interface BatchSummaryPDFOptions {
  importId: string;
  includeAssessmentDetails?: boolean;
  includeStatistics?: boolean;
}

export class ExportController {
  /**
   * Export assessments to CSV format
   */
  async exportToCSV(options: CSVExportOptions = {}): Promise<{
    content: string;
    filename: string;
    rowCount: number;
    contentType: string;
  }> {
    // Get assessments with filters
    const result = await assessmentController.getAssessments({
      ...options.filters,
      limit: options.filters?.limit || 10000, // Higher limit for export
    });

    const assessments = result.data;

    // Build export data
    const exportData = assessments.map((assessment) => {
      const base = {
        id: assessment.id,
        patientIdentifier: assessment.patientIdentifier || '',
        accountNumber: assessment.accountNumber || '',
        createdAt: formatDate(assessment.createdAt),

        // Summary fields
        primaryRecoveryPath: assessment.result.primaryRecoveryPath,
        overallConfidence: assessment.result.overallConfidence,
        estimatedTotalRecovery: assessment.result.estimatedTotalRecovery,
        currentExposure: assessment.result.currentExposure,

        // Key input fields
        stateOfResidence: assessment.input.stateOfResidence,
        stateOfService: assessment.input.stateOfService,
        dateOfService: assessment.input.dateOfService,
        encounterType: assessment.input.encounterType,
        totalCharges: assessment.input.totalCharges,
        insuranceStatus: assessment.input.insuranceStatusOnDOS,

        // Recovery breakdown
        medicaidRecovery: assessment.result.projectedRecovery.medicaid,
        stateProgramRecovery: assessment.result.projectedRecovery.stateProgram,

        // Pathway results
        medicaidStatus: assessment.result.medicaid.status,
        medicaidConfidence: assessment.result.medicaid.confidence,
        medicareStatus: assessment.result.medicare.status,
        dshRelevance: assessment.result.dshRelevance.relevance,
        dshScore: assessment.result.dshRelevance.score,
        stateProgramName: assessment.result.stateProgram.programName,
        stateProgramEligible: assessment.result.stateProgram.eligibilityLikely,

        // Actions
        priorityActions: assessment.result.priorityActions.join('; '),
        immediateActions: assessment.result.immediateActions.join('; '),
      };

      // Optionally include full input
      if (options.includeInput) {
        return {
          ...base,
          ...this.flattenObject(assessment.input, 'input_'),
        };
      }

      // Optionally include full result
      if (options.includeFullResult) {
        return {
          ...base,
          ...this.flattenObject(assessment.result, 'result_'),
        };
      }

      return base;
    });

    // Generate CSV
    const columns = options.columns || Object.keys(exportData[0] || {});
    const csvResult = fileExchangeExportToCSV(exportData, {
      format: 'detailed',
      columns,
    });

    const filename = options.filename || `assessments-export-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      content: csvResult.content,
      filename,
      rowCount: csvResult.rowCount,
      contentType: 'text/csv',
    };
  }

  /**
   * Export prioritized worklist
   */
  async exportWorklist(options: WorklistExportOptions = {}): Promise<{
    content: string;
    filename: string;
    rowCount: number;
    contentType: string;
    summary: {
      totalRecoveryOpportunity: number;
      highPriorityCount: number;
      mediumPriorityCount: number;
      lowPriorityCount: number;
    };
  }> {
    // Get assessments
    const result = await assessmentController.getAssessments(options.filters);
    let assessments = result.data;

    // Apply worklist-specific filters
    if (options.minRecovery !== undefined) {
      assessments = assessments.filter(
        (a) => a.result.estimatedTotalRecovery >= options.minRecovery!
      );
    }
    if (options.minConfidence !== undefined) {
      assessments = assessments.filter(
        (a) => a.result.overallConfidence >= options.minConfidence!
      );
    }

    // Sort by priority
    const sortBy = options.sortBy || 'recovery';
    assessments.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.result.overallConfidence - a.result.overallConfidence;
        case 'urgency':
          // Urgency based on combination of recovery and confidence
          const urgencyA = a.result.estimatedTotalRecovery * (a.result.overallConfidence / 100);
          const urgencyB = b.result.estimatedTotalRecovery * (b.result.overallConfidence / 100);
          return urgencyB - urgencyA;
        case 'recovery':
        default:
          return b.result.estimatedTotalRecovery - a.result.estimatedTotalRecovery;
      }
    });

    // Apply limit
    if (options.limit) {
      assessments = assessments.slice(0, options.limit);
    }

    // Calculate priority tiers
    const getPriority = (assessment: StoredAssessment): 'HIGH' | 'MEDIUM' | 'LOW' => {
      const score = assessment.result.estimatedTotalRecovery * (assessment.result.overallConfidence / 100);
      if (score >= 5000 && assessment.result.overallConfidence >= 70) return 'HIGH';
      if (score >= 1000 && assessment.result.overallConfidence >= 50) return 'MEDIUM';
      return 'LOW';
    };

    // Build worklist data
    const worklistData = assessments.map((assessment, index) => ({
      rank: index + 1,
      priority: getPriority(assessment),
      patientIdentifier: assessment.patientIdentifier || assessment.id.substring(0, 8),
      accountNumber: assessment.accountNumber || '',
      primaryRecoveryPath: assessment.result.primaryRecoveryPath,
      estimatedRecovery: formatCurrency(assessment.result.estimatedTotalRecovery),
      confidence: `${assessment.result.overallConfidence}%`,
      currentExposure: formatCurrency(assessment.result.currentExposure),
      stateProgram: assessment.result.stateProgram.programName,
      medicaidStatus: assessment.result.medicaid.status,
      immediateAction: assessment.result.immediateActions[0] || '',
      dateOfService: assessment.input.dateOfService,
      daysSinceService: this.daysSince(assessment.input.dateOfService),
    }));

    // Generate CSV
    const csvResult = fileExchangeExportWorklist(worklistData);

    // Calculate summary
    const summary = {
      totalRecoveryOpportunity: assessments.reduce(
        (sum, a) => sum + a.result.estimatedTotalRecovery,
        0
      ),
      highPriorityCount: worklistData.filter((w) => w.priority === 'HIGH').length,
      mediumPriorityCount: worklistData.filter((w) => w.priority === 'MEDIUM').length,
      lowPriorityCount: worklistData.filter((w) => w.priority === 'LOW').length,
    };

    const filename = `worklist-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      content: csvResult.content,
      filename,
      rowCount: csvResult.rowCount,
      contentType: 'text/csv',
      summary,
    };
  }

  /**
   * Export executive summary report
   */
  async exportExecutiveSummary(options: ExecutiveSummaryOptions = {}): Promise<{
    content: string;
    filename: string;
    contentType: string;
    data: {
      title: string;
      dateGenerated: string;
      dateRange: { start: string; end: string };
      totalAssessments: number;
      totalRecoveryOpportunity: number;
      averageConfidence: number;
      byPathway: Record<string, { count: number; totalRecovery: number; avgConfidence: number }>;
      byState: Record<string, { count: number; totalRecovery: number }>;
      byEncounterType: Record<string, { count: number; totalRecovery: number }>;
      topOpportunities: Array<{
        patientIdentifier: string;
        recovery: number;
        pathway: string;
      }>;
    };
  }> {
    // Get assessments
    const result = await assessmentController.getAssessments(options.filters);
    const assessments = result.data;

    // Calculate date range
    const dateRange = options.dateRange || {
      start: assessments.length > 0
        ? assessments.reduce((min, a) => a.createdAt < min ? a.createdAt : min, assessments[0].createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    };

    // Aggregate by pathway
    const byPathway: Record<string, { count: number; totalRecovery: number; avgConfidence: number; confidenceSum: number }> = {};
    for (const assessment of assessments) {
      const pathway = assessment.result.primaryRecoveryPath;
      if (!byPathway[pathway]) {
        byPathway[pathway] = { count: 0, totalRecovery: 0, avgConfidence: 0, confidenceSum: 0 };
      }
      byPathway[pathway].count++;
      byPathway[pathway].totalRecovery += assessment.result.estimatedTotalRecovery;
      byPathway[pathway].confidenceSum += assessment.result.overallConfidence;
    }
    for (const pathway of Object.keys(byPathway)) {
      byPathway[pathway].avgConfidence = Math.round(byPathway[pathway].confidenceSum / byPathway[pathway].count);
      delete (byPathway[pathway] as Record<string, unknown>).confidenceSum;
    }

    // Aggregate by state
    const byState: Record<string, { count: number; totalRecovery: number }> = {};
    for (const assessment of assessments) {
      const state = assessment.input.stateOfService;
      if (!byState[state]) {
        byState[state] = { count: 0, totalRecovery: 0 };
      }
      byState[state].count++;
      byState[state].totalRecovery += assessment.result.estimatedTotalRecovery;
    }

    // Aggregate by encounter type
    const byEncounterType: Record<string, { count: number; totalRecovery: number }> = {};
    for (const assessment of assessments) {
      const type = assessment.input.encounterType;
      if (!byEncounterType[type]) {
        byEncounterType[type] = { count: 0, totalRecovery: 0 };
      }
      byEncounterType[type].count++;
      byEncounterType[type].totalRecovery += assessment.result.estimatedTotalRecovery;
    }

    // Top opportunities
    const sorted = [...assessments].sort(
      (a, b) => b.result.estimatedTotalRecovery - a.result.estimatedTotalRecovery
    );
    const topOpportunities = sorted.slice(0, 10).map((a) => ({
      patientIdentifier: a.patientIdentifier || a.id.substring(0, 8),
      recovery: a.result.estimatedTotalRecovery,
      pathway: a.result.primaryRecoveryPath,
    }));

    // Summary data
    const data = {
      title: options.title || 'Recovery Opportunity Executive Summary',
      dateGenerated: new Date().toISOString(),
      dateRange,
      totalAssessments: assessments.length,
      totalRecoveryOpportunity: assessments.reduce(
        (sum, a) => sum + a.result.estimatedTotalRecovery,
        0
      ),
      averageConfidence: assessments.length > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + a.result.overallConfidence, 0) / assessments.length
          )
        : 0,
      byPathway: byPathway as Record<string, { count: number; totalRecovery: number; avgConfidence: number }>,
      byState,
      byEncounterType,
      topOpportunities,
    };

    // Generate CSV summary - pass the aggregated pathway data as an array
    const summaryRows = Object.entries(data.byPathway).map(([pathway, stats]) => ({
      pathway,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      avgConfidence: stats.avgConfidence,
    }));
    const csvResult = fileExchangeExportExecutiveSummary(summaryRows);

    const filename = `executive-summary-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      content: csvResult.content,
      filename,
      contentType: 'text/csv',
      data,
    };
  }

  /**
   * Export detailed PDF report (returns JSON for frontend PDF generation)
   */
  async exportPDF(options: PDFExportOptions = {}): Promise<{
    filename: string;
    contentType: string;
    data: {
      title: string;
      generatedAt: string;
      assessments: Array<{
        id: string;
        patientIdentifier?: string;
        summary: {
          primaryRecoveryPath: string;
          overallConfidence: number;
          estimatedTotalRecovery: number;
          currentExposure: number;
        };
        input: Record<string, unknown>;
        pathways: {
          medicaid: Record<string, unknown>;
          medicare: Record<string, unknown>;
          dshRelevance: Record<string, unknown>;
          stateProgram: Record<string, unknown>;
        };
        actions: {
          immediate: string[];
          followUp: string[];
          documentation: string[];
        };
      }>;
      aggregates?: {
        totalRecovery: number;
        totalExposure: number;
        avgConfidence: number;
        pathwayBreakdown: Record<string, number>;
      };
    };
  }> {
    let assessments: StoredAssessment[] = [];

    // Get single assessment or filtered list
    if (options.assessmentId) {
      const assessment = await assessmentController.getAssessmentById(options.assessmentId);
      if (assessment) {
        assessments = [assessment];
      }
    } else {
      const result = await assessmentController.getAssessments(options.filters);
      assessments = result.data;
    }

    // Build PDF data structure
    const pdfAssessments = assessments.map((a) => ({
      id: a.id,
      patientIdentifier: a.patientIdentifier,
      summary: {
        primaryRecoveryPath: a.result.primaryRecoveryPath,
        overallConfidence: a.result.overallConfidence,
        estimatedTotalRecovery: a.result.estimatedTotalRecovery,
        currentExposure: a.result.currentExposure,
      },
      input: a.input as Record<string, unknown>,
      pathways: {
        medicaid: a.result.medicaid as Record<string, unknown>,
        medicare: a.result.medicare as Record<string, unknown>,
        dshRelevance: a.result.dshRelevance as Record<string, unknown>,
        stateProgram: a.result.stateProgram as Record<string, unknown>,
      },
      actions: {
        immediate: a.result.immediateActions,
        followUp: a.result.followUpActions,
        documentation: a.result.documentationNeeded,
      },
    }));

    // Calculate aggregates if multiple assessments
    let aggregates: {
      totalRecovery: number;
      totalExposure: number;
      avgConfidence: number;
      pathwayBreakdown: Record<string, number>;
    } | undefined;

    if (assessments.length > 1) {
      const pathwayBreakdown: Record<string, number> = {};
      for (const a of assessments) {
        const pathway = a.result.primaryRecoveryPath;
        pathwayBreakdown[pathway] = (pathwayBreakdown[pathway] || 0) + 1;
      }

      aggregates = {
        totalRecovery: assessments.reduce((sum, a) => sum + a.result.estimatedTotalRecovery, 0),
        totalExposure: assessments.reduce((sum, a) => sum + a.result.currentExposure, 0),
        avgConfidence: Math.round(
          assessments.reduce((sum, a) => sum + a.result.overallConfidence, 0) / assessments.length
        ),
        pathwayBreakdown,
      };
    }

    const filename = options.assessmentId
      ? `assessment-${options.assessmentId.substring(0, 8)}.pdf`
      : `assessments-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      filename,
      contentType: 'application/json', // Frontend will generate actual PDF
      data: {
        title: options.title || 'Recovery Assessment Report',
        generatedAt: new Date().toISOString(),
        assessments: pdfAssessments,
        aggregates,
      },
    };
  }

  /**
   * Export executive summary PDF data
   * Returns structured data for client-side PDF generation
   */
  async exportExecutiveSummaryPDF(options: ExecutiveSummaryPDFOptions = {}): Promise<{
    filename: string;
    contentType: string;
    data: {
      type: 'executive-summary';
      title: string;
      generatedAt: string;
      dateRange: { start: string; end: string };
      summary: {
        totalAssessments: number;
        totalRecoveryOpportunity: number;
        totalCurrentExposure: number;
        averageConfidence: number;
        averageRecoveryPerCase: number;
      };
      byPathway: Array<{
        pathway: string;
        count: number;
        totalRecovery: number;
        avgConfidence: number;
        percentage: number;
      }>;
      byState: Array<{
        state: string;
        count: number;
        totalRecovery: number;
        percentage: number;
      }>;
      byEncounterType: Array<{
        type: string;
        count: number;
        totalRecovery: number;
        percentage: number;
      }>;
      topOpportunities: Array<{
        rank: number;
        patientIdentifier: string;
        accountNumber: string;
        recovery: number;
        confidence: number;
        pathway: string;
      }>;
      confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
      };
    };
  }> {
    // Get assessments with filters
    const result = await assessmentController.getAssessments(options.filters);
    const assessments = result.data;

    // Calculate date range
    const dateRange = options.dateRange || {
      start: assessments.length > 0
        ? assessments.reduce((min, a) => a.createdAt < min ? a.createdAt : min, assessments[0].createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    };

    // Calculate totals
    const totalRecoveryOpportunity = assessments.reduce((sum, a) => sum + a.result.estimatedTotalRecovery, 0);
    const totalCurrentExposure = assessments.reduce((sum, a) => sum + a.result.currentExposure, 0);
    const avgConfidence = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + a.result.overallConfidence, 0) / assessments.length)
      : 0;

    // Aggregate by pathway
    const pathwayMap: Record<string, { count: number; totalRecovery: number; confidenceSum: number }> = {};
    for (const assessment of assessments) {
      const pathway = assessment.result.primaryRecoveryPath;
      if (!pathwayMap[pathway]) {
        pathwayMap[pathway] = { count: 0, totalRecovery: 0, confidenceSum: 0 };
      }
      pathwayMap[pathway].count++;
      pathwayMap[pathway].totalRecovery += assessment.result.estimatedTotalRecovery;
      pathwayMap[pathway].confidenceSum += assessment.result.overallConfidence;
    }
    const byPathway = Object.entries(pathwayMap).map(([pathway, stats]) => ({
      pathway,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      avgConfidence: Math.round(stats.confidenceSum / stats.count),
      percentage: assessments.length > 0 ? Math.round((stats.count / assessments.length) * 100) : 0,
    })).sort((a, b) => b.totalRecovery - a.totalRecovery);

    // Aggregate by state
    const stateMap: Record<string, { count: number; totalRecovery: number }> = {};
    for (const assessment of assessments) {
      const state = assessment.input.stateOfService;
      if (!stateMap[state]) {
        stateMap[state] = { count: 0, totalRecovery: 0 };
      }
      stateMap[state].count++;
      stateMap[state].totalRecovery += assessment.result.estimatedTotalRecovery;
    }
    const byState = Object.entries(stateMap).map(([state, stats]) => ({
      state,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      percentage: assessments.length > 0 ? Math.round((stats.count / assessments.length) * 100) : 0,
    })).sort((a, b) => b.totalRecovery - a.totalRecovery);

    // Aggregate by encounter type
    const encounterMap: Record<string, { count: number; totalRecovery: number }> = {};
    for (const assessment of assessments) {
      const type = assessment.input.encounterType;
      if (!encounterMap[type]) {
        encounterMap[type] = { count: 0, totalRecovery: 0 };
      }
      encounterMap[type].count++;
      encounterMap[type].totalRecovery += assessment.result.estimatedTotalRecovery;
    }
    const byEncounterType = Object.entries(encounterMap).map(([type, stats]) => ({
      type,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      percentage: assessments.length > 0 ? Math.round((stats.count / assessments.length) * 100) : 0,
    })).sort((a, b) => b.totalRecovery - a.totalRecovery);

    // Top opportunities
    const sorted = [...assessments].sort((a, b) => b.result.estimatedTotalRecovery - a.result.estimatedTotalRecovery);
    const topOpportunities = sorted.slice(0, 10).map((a, index) => ({
      rank: index + 1,
      patientIdentifier: a.patientIdentifier || a.id.substring(0, 8),
      accountNumber: a.accountNumber || '',
      recovery: a.result.estimatedTotalRecovery,
      confidence: a.result.overallConfidence,
      pathway: a.result.primaryRecoveryPath,
    }));

    // Confidence distribution
    const confidenceDistribution = {
      high: assessments.filter(a => a.result.overallConfidence >= 70).length,
      medium: assessments.filter(a => a.result.overallConfidence >= 40 && a.result.overallConfidence < 70).length,
      low: assessments.filter(a => a.result.overallConfidence < 40).length,
    };

    const filename = `executive-summary-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      filename,
      contentType: 'application/json',
      data: {
        type: 'executive-summary',
        title: options.title || 'Recovery Opportunity Executive Summary',
        generatedAt: new Date().toISOString(),
        dateRange,
        summary: {
          totalAssessments: assessments.length,
          totalRecoveryOpportunity,
          totalCurrentExposure,
          averageConfidence: avgConfidence,
          averageRecoveryPerCase: assessments.length > 0 ? Math.round(totalRecoveryOpportunity / assessments.length) : 0,
        },
        byPathway,
        byState,
        byEncounterType,
        topOpportunities,
        confidenceDistribution,
      },
    };
  }

  /**
   * Export detailed assessment PDF data for a single assessment
   */
  async exportDetailedAssessmentPDF(options: DetailedAssessmentPDFOptions): Promise<{
    filename: string;
    contentType: string;
    data: {
      type: 'detailed-assessment';
      generatedAt: string;
      assessment: {
        id: string;
        patientIdentifier?: string;
        accountNumber?: string;
        createdAt: string;
        summary: {
          primaryRecoveryPath: string;
          overallConfidence: number;
          estimatedTotalRecovery: number;
          currentExposure: number;
          projectedRecovery: Record<string, number>;
        };
        input?: Record<string, unknown>;
        pathways?: {
          medicaid: Record<string, unknown>;
          medicare: Record<string, unknown>;
          dshRelevance: Record<string, unknown>;
          stateProgram: Record<string, unknown>;
        };
        actions?: {
          immediate: string[];
          priority: string[];
          followUp: string[];
          documentation: string[];
        };
        reasoning?: string;
      };
    };
  } | null> {
    const assessment = await assessmentController.getAssessmentById(options.assessmentId);
    if (!assessment) {
      return null;
    }

    const assessmentData: {
      id: string;
      patientIdentifier?: string;
      accountNumber?: string;
      createdAt: string;
      summary: {
        primaryRecoveryPath: string;
        overallConfidence: number;
        estimatedTotalRecovery: number;
        currentExposure: number;
        projectedRecovery: Record<string, number>;
      };
      input?: Record<string, unknown>;
      pathways?: {
        medicaid: Record<string, unknown>;
        medicare: Record<string, unknown>;
        dshRelevance: Record<string, unknown>;
        stateProgram: Record<string, unknown>;
      };
      actions?: {
        immediate: string[];
        priority: string[];
        followUp: string[];
        documentation: string[];
      };
      reasoning?: string;
    } = {
      id: assessment.id,
      patientIdentifier: assessment.patientIdentifier,
      accountNumber: assessment.accountNumber,
      createdAt: assessment.createdAt.toISOString(),
      summary: {
        primaryRecoveryPath: assessment.result.primaryRecoveryPath,
        overallConfidence: assessment.result.overallConfidence,
        estimatedTotalRecovery: assessment.result.estimatedTotalRecovery,
        currentExposure: assessment.result.currentExposure,
        projectedRecovery: assessment.result.projectedRecovery as Record<string, number>,
      },
    };

    if (options.includeInput !== false) {
      assessmentData.input = assessment.input as Record<string, unknown>;
    }

    if (options.includePathwayDetails !== false) {
      assessmentData.pathways = {
        medicaid: assessment.result.medicaid as Record<string, unknown>,
        medicare: assessment.result.medicare as Record<string, unknown>,
        dshRelevance: assessment.result.dshRelevance as Record<string, unknown>,
        stateProgram: assessment.result.stateProgram as Record<string, unknown>,
      };
    }

    if (options.includeActions !== false) {
      assessmentData.actions = {
        immediate: assessment.result.immediateActions,
        priority: assessment.result.priorityActions,
        followUp: assessment.result.followUpActions,
        documentation: assessment.result.documentationNeeded,
      };
    }

    if (assessment.result.reasoning) {
      assessmentData.reasoning = assessment.result.reasoning;
    }

    const filename = `assessment-${assessment.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      filename,
      contentType: 'application/json',
      data: {
        type: 'detailed-assessment',
        generatedAt: new Date().toISOString(),
        assessment: assessmentData,
      },
    };
  }

  /**
   * Export worklist PDF data
   */
  async exportWorklistPDF(options: WorklistPDFOptions = {}): Promise<{
    filename: string;
    contentType: string;
    data: {
      type: 'worklist';
      title: string;
      generatedAt: string;
      summary: {
        totalCases: number;
        totalRecoveryOpportunity: number;
        highPriorityCount: number;
        mediumPriorityCount: number;
        lowPriorityCount: number;
      };
      worklist: Array<{
        rank: number;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        patientIdentifier: string;
        accountNumber: string;
        primaryRecoveryPath: string;
        estimatedRecovery: number;
        confidence: number;
        currentExposure: number;
        stateProgram: string;
        medicaidStatus: string;
        immediateAction: string;
        dateOfService: string;
        daysSinceService: number;
      }>;
    };
  }> {
    // Get assessments - either by IDs or by filters
    let assessments: StoredAssessment[] = [];

    if (options.assessmentIds && options.assessmentIds.length > 0) {
      // Fetch specific assessments by ID
      for (const id of options.assessmentIds) {
        const assessment = await assessmentController.getAssessmentById(id);
        if (assessment) {
          assessments.push(assessment);
        }
      }
    } else {
      // Fetch by filters
      const result = await assessmentController.getAssessments(options.filters);
      assessments = result.data;
    }

    // Apply worklist-specific filters
    if (options.minRecovery !== undefined) {
      assessments = assessments.filter(a => a.result.estimatedTotalRecovery >= options.minRecovery!);
    }
    if (options.minConfidence !== undefined) {
      assessments = assessments.filter(a => a.result.overallConfidence >= options.minConfidence!);
    }

    // Sort by priority
    const sortBy = options.sortBy || 'recovery';
    assessments.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.result.overallConfidence - a.result.overallConfidence;
        case 'urgency':
          const urgencyA = a.result.estimatedTotalRecovery * (a.result.overallConfidence / 100);
          const urgencyB = b.result.estimatedTotalRecovery * (b.result.overallConfidence / 100);
          return urgencyB - urgencyA;
        case 'recovery':
        default:
          return b.result.estimatedTotalRecovery - a.result.estimatedTotalRecovery;
      }
    });

    // Apply limit
    if (options.limit) {
      assessments = assessments.slice(0, options.limit);
    }

    // Calculate priority tiers
    const getPriority = (assessment: StoredAssessment): 'HIGH' | 'MEDIUM' | 'LOW' => {
      const score = assessment.result.estimatedTotalRecovery * (assessment.result.overallConfidence / 100);
      if (score >= 5000 && assessment.result.overallConfidence >= 70) return 'HIGH';
      if (score >= 1000 && assessment.result.overallConfidence >= 50) return 'MEDIUM';
      return 'LOW';
    };

    // Build worklist data
    const worklist = assessments.map((assessment, index) => ({
      rank: index + 1,
      priority: getPriority(assessment),
      patientIdentifier: assessment.patientIdentifier || assessment.id.substring(0, 8),
      accountNumber: assessment.accountNumber || '',
      primaryRecoveryPath: assessment.result.primaryRecoveryPath,
      estimatedRecovery: assessment.result.estimatedTotalRecovery,
      confidence: assessment.result.overallConfidence,
      currentExposure: assessment.result.currentExposure,
      stateProgram: assessment.result.stateProgram.programName,
      medicaidStatus: assessment.result.medicaid.status,
      immediateAction: assessment.result.immediateActions[0] || '',
      dateOfService: assessment.input.dateOfService,
      daysSinceService: this.daysSince(assessment.input.dateOfService),
    }));

    // Calculate summary
    const summary = {
      totalCases: worklist.length,
      totalRecoveryOpportunity: assessments.reduce((sum, a) => sum + a.result.estimatedTotalRecovery, 0),
      highPriorityCount: worklist.filter(w => w.priority === 'HIGH').length,
      mediumPriorityCount: worklist.filter(w => w.priority === 'MEDIUM').length,
      lowPriorityCount: worklist.filter(w => w.priority === 'LOW').length,
    };

    const filename = `worklist-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      filename,
      contentType: 'application/json',
      data: {
        type: 'worklist',
        title: 'Recovery Worklist',
        generatedAt: new Date().toISOString(),
        summary,
        worklist,
      },
    };
  }

  /**
   * Export batch import summary PDF data
   */
  async exportBatchSummaryPDF(options: BatchSummaryPDFOptions): Promise<{
    filename: string;
    contentType: string;
    data: {
      type: 'batch-summary';
      title: string;
      generatedAt: string;
      importInfo: {
        importId: string;
        importDate: string;
        totalRecords: number;
        processedRecords: number;
        skippedRecords: number;
        errorCount: number;
      };
      summary: {
        totalRecoveryOpportunity: number;
        totalCurrentExposure: number;
        averageConfidence: number;
        averageRecoveryPerCase: number;
      };
      byPathway: Array<{
        pathway: string;
        count: number;
        totalRecovery: number;
        avgConfidence: number;
        percentage: number;
      }>;
      byState: Array<{
        state: string;
        count: number;
        totalRecovery: number;
        percentage: number;
      }>;
      confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
      };
      topOpportunities: Array<{
        rank: number;
        patientIdentifier: string;
        accountNumber: string;
        recovery: number;
        confidence: number;
        pathway: string;
      }>;
      assessmentDetails?: Array<{
        id: string;
        patientIdentifier: string;
        accountNumber: string;
        primaryRecoveryPath: string;
        estimatedRecovery: number;
        confidence: number;
      }>;
    };
  }> {
    // Get assessments for this import batch
    const result = await assessmentController.getAssessments({
      importId: options.importId,
      limit: 10000,
    });
    const assessments = result.data;

    // Calculate totals
    const totalRecoveryOpportunity = assessments.reduce((sum, a) => sum + a.result.estimatedTotalRecovery, 0);
    const totalCurrentExposure = assessments.reduce((sum, a) => sum + a.result.currentExposure, 0);
    const avgConfidence = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + a.result.overallConfidence, 0) / assessments.length)
      : 0;

    // Aggregate by pathway
    const pathwayMap: Record<string, { count: number; totalRecovery: number; confidenceSum: number }> = {};
    for (const assessment of assessments) {
      const pathway = assessment.result.primaryRecoveryPath;
      if (!pathwayMap[pathway]) {
        pathwayMap[pathway] = { count: 0, totalRecovery: 0, confidenceSum: 0 };
      }
      pathwayMap[pathway].count++;
      pathwayMap[pathway].totalRecovery += assessment.result.estimatedTotalRecovery;
      pathwayMap[pathway].confidenceSum += assessment.result.overallConfidence;
    }
    const byPathway = Object.entries(pathwayMap).map(([pathway, stats]) => ({
      pathway,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      avgConfidence: Math.round(stats.confidenceSum / stats.count),
      percentage: assessments.length > 0 ? Math.round((stats.count / assessments.length) * 100) : 0,
    })).sort((a, b) => b.totalRecovery - a.totalRecovery);

    // Aggregate by state
    const stateMap: Record<string, { count: number; totalRecovery: number }> = {};
    for (const assessment of assessments) {
      const state = assessment.input.stateOfService;
      if (!stateMap[state]) {
        stateMap[state] = { count: 0, totalRecovery: 0 };
      }
      stateMap[state].count++;
      stateMap[state].totalRecovery += assessment.result.estimatedTotalRecovery;
    }
    const byState = Object.entries(stateMap).map(([state, stats]) => ({
      state,
      count: stats.count,
      totalRecovery: stats.totalRecovery,
      percentage: assessments.length > 0 ? Math.round((stats.count / assessments.length) * 100) : 0,
    })).sort((a, b) => b.totalRecovery - a.totalRecovery);

    // Confidence distribution
    const confidenceDistribution = {
      high: assessments.filter(a => a.result.overallConfidence >= 70).length,
      medium: assessments.filter(a => a.result.overallConfidence >= 40 && a.result.overallConfidence < 70).length,
      low: assessments.filter(a => a.result.overallConfidence < 40).length,
    };

    // Top opportunities
    const sorted = [...assessments].sort((a, b) => b.result.estimatedTotalRecovery - a.result.estimatedTotalRecovery);
    const topOpportunities = sorted.slice(0, 10).map((a, index) => ({
      rank: index + 1,
      patientIdentifier: a.patientIdentifier || a.id.substring(0, 8),
      accountNumber: a.accountNumber || '',
      recovery: a.result.estimatedTotalRecovery,
      confidence: a.result.overallConfidence,
      pathway: a.result.primaryRecoveryPath,
    }));

    // Optional assessment details
    let assessmentDetails;
    if (options.includeAssessmentDetails) {
      assessmentDetails = assessments.map(a => ({
        id: a.id,
        patientIdentifier: a.patientIdentifier || a.id.substring(0, 8),
        accountNumber: a.accountNumber || '',
        primaryRecoveryPath: a.result.primaryRecoveryPath,
        estimatedRecovery: a.result.estimatedTotalRecovery,
        confidence: a.result.overallConfidence,
      }));
    }

    const filename = `batch-summary-${options.importId.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      filename,
      contentType: 'application/json',
      data: {
        type: 'batch-summary',
        title: 'Batch Import Summary',
        generatedAt: new Date().toISOString(),
        importInfo: {
          importId: options.importId,
          importDate: new Date().toISOString(),
          totalRecords: result.total,
          processedRecords: assessments.length,
          skippedRecords: 0,
          errorCount: 0,
        },
        summary: {
          totalRecoveryOpportunity,
          totalCurrentExposure,
          averageConfidence: avgConfidence,
          averageRecoveryPerCase: assessments.length > 0 ? Math.round(totalRecoveryOpportunity / assessments.length) : 0,
        },
        byPathway,
        byState,
        confidenceDistribution,
        topOpportunities,
        assessmentDetails,
      },
    };
  }

  /**
   * Helper: Flatten nested object for CSV export
   */
  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix + key;

      if (value === null || value === undefined) {
        result[newKey] = '';
      } else if (Array.isArray(value)) {
        result[newKey] = value.join('; ');
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey + '_'));
      } else if (value instanceof Date) {
        result[newKey] = formatDate(value);
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Helper: Calculate days since a date
   */
  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const exportController = new ExportController();
