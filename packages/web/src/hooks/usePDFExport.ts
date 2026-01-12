// @ts-nocheck
'use client';

import { useState, useCallback } from 'react';
import type { AssessmentFilters } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types for PDF export data
export interface ExecutiveSummaryPDFData {
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
}

export interface DetailedAssessmentPDFData {
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
}

export interface WorklistPDFData {
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
}

export interface BatchSummaryPDFData {
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
}

export type PDFExportData = ExecutiveSummaryPDFData | DetailedAssessmentPDFData | WorklistPDFData | BatchSummaryPDFData;

export interface PDFExportResult {
  success: boolean;
  data: PDFExportData;
  filename: string;
  contentType: string;
}

export interface UsePDFExportReturn {
  loading: boolean;
  error: string | null;
  exportExecutiveSummary: (options?: {
    filters?: AssessmentFilters;
    title?: string;
    dateRange?: { start: string; end: string };
  }) => Promise<PDFExportResult | null>;
  exportAssessment: (id: string, options?: {
    includeInput?: boolean;
    includePathwayDetails?: boolean;
    includeActions?: boolean;
  }) => Promise<PDFExportResult | null>;
  exportWorklist: (options?: {
    assessmentIds?: string[];
    filters?: AssessmentFilters;
    minRecovery?: number;
    minConfidence?: number;
    sortBy?: 'recovery' | 'confidence' | 'urgency';
    limit?: number;
  }) => Promise<PDFExportResult | null>;
  exportBatchSummary: (importId: string, options?: {
    includeAssessmentDetails?: boolean;
    includeStatistics?: boolean;
  }) => Promise<PDFExportResult | null>;
  downloadPDF: (data: PDFExportData, filename: string) => void;
}

/**
 * Format currency value
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate PDF content from data
 * This creates a simple text-based PDF representation
 * In production, you might use a library like jsPDF or pdfmake
 */
function generatePDFContent(data: PDFExportData): string {
  const lines: string[] = [];

  if (data.type === 'executive-summary') {
    lines.push('='.repeat(60));
    lines.push(data.title);
    lines.push('='.repeat(60));
    lines.push(`Generated: ${formatDate(data.generatedAt)}`);
    lines.push(`Date Range: ${data.dateRange.start} to ${data.dateRange.end}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Total Assessments: ${data.summary.totalAssessments}`);
    lines.push(`Total Recovery Opportunity: ${formatCurrency(data.summary.totalRecoveryOpportunity)}`);
    lines.push(`Total Current Exposure: ${formatCurrency(data.summary.totalCurrentExposure)}`);
    lines.push(`Average Confidence: ${data.summary.averageConfidence}%`);
    lines.push(`Average Recovery Per Case: ${formatCurrency(data.summary.averageRecoveryPerCase)}`);
    lines.push('');
    lines.push('BY PATHWAY');
    lines.push('-'.repeat(40));
    for (const p of data.byPathway) {
      lines.push(`${p.pathway}: ${p.count} cases (${p.percentage}%) - ${formatCurrency(p.totalRecovery)} - Avg Confidence: ${p.avgConfidence}%`);
    }
    lines.push('');
    lines.push('BY STATE');
    lines.push('-'.repeat(40));
    for (const s of data.byState) {
      lines.push(`${s.state}: ${s.count} cases (${s.percentage}%) - ${formatCurrency(s.totalRecovery)}`);
    }
    lines.push('');
    lines.push('TOP OPPORTUNITIES');
    lines.push('-'.repeat(40));
    for (const o of data.topOpportunities) {
      lines.push(`${o.rank}. ${o.patientIdentifier} (${o.accountNumber}) - ${formatCurrency(o.recovery)} - ${o.pathway} - ${o.confidence}%`);
    }
  } else if (data.type === 'detailed-assessment') {
    const a = data.assessment;
    lines.push('='.repeat(60));
    lines.push('DETAILED ASSESSMENT REPORT');
    lines.push('='.repeat(60));
    lines.push(`Generated: ${formatDate(data.generatedAt)}`);
    lines.push('');
    lines.push('ASSESSMENT SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`ID: ${a.id}`);
    lines.push(`Patient: ${a.patientIdentifier || 'N/A'}`);
    lines.push(`Account: ${a.accountNumber || 'N/A'}`);
    lines.push(`Primary Recovery Path: ${a.summary.primaryRecoveryPath}`);
    lines.push(`Overall Confidence: ${a.summary.overallConfidence}%`);
    lines.push(`Estimated Total Recovery: ${formatCurrency(a.summary.estimatedTotalRecovery)}`);
    lines.push(`Current Exposure: ${formatCurrency(a.summary.currentExposure)}`);
    if (a.actions) {
      lines.push('');
      lines.push('RECOMMENDED ACTIONS');
      lines.push('-'.repeat(40));
      lines.push('Immediate Actions:');
      for (const action of a.actions.immediate) {
        lines.push(`  - ${action}`);
      }
      lines.push('Priority Actions:');
      for (const action of a.actions.priority) {
        lines.push(`  - ${action}`);
      }
    }
    if (a.reasoning) {
      lines.push('');
      lines.push('REASONING');
      lines.push('-'.repeat(40));
      lines.push(a.reasoning);
    }
  } else if (data.type === 'worklist') {
    lines.push('='.repeat(60));
    lines.push(data.title);
    lines.push('='.repeat(60));
    lines.push(`Generated: ${formatDate(data.generatedAt)}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Total Cases: ${data.summary.totalCases}`);
    lines.push(`Total Recovery Opportunity: ${formatCurrency(data.summary.totalRecoveryOpportunity)}`);
    lines.push(`High Priority: ${data.summary.highPriorityCount}`);
    lines.push(`Medium Priority: ${data.summary.mediumPriorityCount}`);
    lines.push(`Low Priority: ${data.summary.lowPriorityCount}`);
    lines.push('');
    lines.push('WORKLIST');
    lines.push('-'.repeat(40));
    for (const w of data.worklist) {
      lines.push(`${w.rank}. [${w.priority}] ${w.patientIdentifier} (${w.accountNumber})`);
      lines.push(`   Path: ${w.primaryRecoveryPath} | Recovery: ${formatCurrency(w.estimatedRecovery)} | Confidence: ${w.confidence}%`);
      lines.push(`   Action: ${w.immediateAction}`);
      lines.push('');
    }
  } else if (data.type === 'batch-summary') {
    lines.push('='.repeat(60));
    lines.push(data.title);
    lines.push('='.repeat(60));
    lines.push(`Generated: ${formatDate(data.generatedAt)}`);
    lines.push('');
    lines.push('IMPORT INFO');
    lines.push('-'.repeat(40));
    lines.push(`Import ID: ${data.importInfo.importId}`);
    lines.push(`Import Date: ${formatDate(data.importInfo.importDate)}`);
    lines.push(`Total Records: ${data.importInfo.totalRecords}`);
    lines.push(`Processed: ${data.importInfo.processedRecords}`);
    lines.push(`Skipped: ${data.importInfo.skippedRecords}`);
    lines.push(`Errors: ${data.importInfo.errorCount}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Total Recovery Opportunity: ${formatCurrency(data.summary.totalRecoveryOpportunity)}`);
    lines.push(`Total Current Exposure: ${formatCurrency(data.summary.totalCurrentExposure)}`);
    lines.push(`Average Confidence: ${data.summary.averageConfidence}%`);
    lines.push(`Average Recovery Per Case: ${formatCurrency(data.summary.averageRecoveryPerCase)}`);
    lines.push('');
    lines.push('BY PATHWAY');
    lines.push('-'.repeat(40));
    for (const p of data.byPathway) {
      lines.push(`${p.pathway}: ${p.count} cases (${p.percentage}%) - ${formatCurrency(p.totalRecovery)}`);
    }
    lines.push('');
    lines.push('TOP OPPORTUNITIES');
    lines.push('-'.repeat(40));
    for (const o of data.topOpportunities) {
      lines.push(`${o.rank}. ${o.patientIdentifier} - ${formatCurrency(o.recovery)} - ${o.pathway}`);
    }
  }

  return lines.join('\n');
}

/**
 * Hook for handling PDF export API calls
 */
export function usePDFExport(): UsePDFExportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportExecutiveSummary = useCallback(
    async (options: {
      filters?: AssessmentFilters;
      title?: string;
      dateRange?: { start: string; end: string };
    } = {}): Promise<PDFExportResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/export/pdf/executive-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to export executive summary');
        }

        const result = await response.json();
        return {
          success: true,
          data: result.data,
          filename: result.filename,
          contentType: result.contentType,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export executive summary';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const exportAssessment = useCallback(
    async (
      id: string,
      options: {
        includeInput?: boolean;
        includePathwayDetails?: boolean;
        includeActions?: boolean;
      } = {}
    ): Promise<PDFExportResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/export/pdf/assessment/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to export assessment');
        }

        const result = await response.json();
        return {
          success: true,
          data: result.data,
          filename: result.filename,
          contentType: result.contentType,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export assessment';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const exportWorklist = useCallback(
    async (options: {
      assessmentIds?: string[];
      filters?: AssessmentFilters;
      minRecovery?: number;
      minConfidence?: number;
      sortBy?: 'recovery' | 'confidence' | 'urgency';
      limit?: number;
    } = {}): Promise<PDFExportResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/export/pdf/worklist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to export worklist');
        }

        const result = await response.json();
        return {
          success: true,
          data: result.data,
          filename: result.filename,
          contentType: result.contentType,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export worklist';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const exportBatchSummary = useCallback(
    async (
      importId: string,
      options: {
        includeAssessmentDetails?: boolean;
        includeStatistics?: boolean;
      } = {}
    ): Promise<PDFExportResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/export/pdf/batch-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            importId,
            ...options,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to export batch summary');
        }

        const result = await response.json();
        return {
          success: true,
          data: result.data,
          filename: result.filename,
          contentType: result.contentType,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export batch summary';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const downloadPDF = useCallback((data: PDFExportData, filename: string): void => {
    // Generate PDF content
    const content = generatePDFContent(data);

    // Create blob and download
    // Note: In production, you'd use a proper PDF library like jsPDF or pdfmake
    // For now, we create a text file that can be converted to PDF
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.txt'); // Use .txt for now
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    loading,
    error,
    exportExecutiveSummary,
    exportAssessment,
    exportWorklist,
    exportBatchSummary,
    downloadPDF,
  };
}
