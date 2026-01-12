/**
 * Batch Import Summary Report Template
 * Generates PDF reports summarizing batch import operations
 */

import { HalcyonPDFGenerator, formatCurrency, formatPercentage, formatDate } from '../pdf-generator.js';
import type { ImportResult, Assessment } from '../types.js';
import { HALCYON_COLORS, SPACING, FONT_SIZES } from '../styles.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchSummaryOptions {
  /** Include detailed error log */
  includeErrorDetails?: boolean;
  /** Include preview of imported cases */
  includePreview?: boolean;
  /** Maximum number of cases to preview */
  previewLimit?: number;
  /** Include recommended next steps */
  includeRecommendations?: boolean;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate a Batch Import Summary PDF report
 * @param importResult - The import result data
 * @param options - Report generation options
 * @returns Buffer containing the PDF
 */
export async function generateBatchSummary(
  importResult: ImportResult,
  options: BatchSummaryOptions = {}
): Promise<Buffer> {
  const {
    includeErrorDetails = true,
    includePreview = true,
    previewLimit = 10,
    includeRecommendations = true,
  } = options;

  const pdf = new HalcyonPDFGenerator({
    title: 'Batch Import Summary',
    subtitle: `Import ID: ${importResult.importId.substring(0, 8)}...`,
    showPageNumbers: true,
    confidential: true,
    footerText: 'Confidential - Halcyon RCM Partner Assistant',
  });

  // Add header
  pdf.addHeader();

  // Add import overview section
  addImportOverviewSection(pdf, importResult);

  // Add statistics section
  addStatisticsSection(pdf, importResult);

  // Add error log section if applicable
  if (includeErrorDetails && importResult.errors.length > 0) {
    addErrorLogSection(pdf, importResult);
  }

  // Add preview of imported cases
  if (includePreview && importResult.previewCases.length > 0) {
    addPreviewSection(pdf, importResult, previewLimit);
  }

  // Add recommended next steps
  if (includeRecommendations) {
    addRecommendationsSection(pdf, importResult);
  }

  // Generate and return buffer
  return pdf.generate();
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Add import overview section
 */
function addImportOverviewSection(pdf: HalcyonPDFGenerator, importResult: ImportResult): void {
  pdf.addSectionHeader('Import Overview');

  // Status indicator
  const statusColor = getStatusColor(importResult.status);
  const statusText = formatStatus(importResult.status);

  pdf.addParagraph(`Status: ${statusText}`, {
    bold: true,
    color: statusColor,
    fontSize: FONT_SIZES.heading3,
  });

  pdf.addSpacing(SPACING.sm);

  // File information
  pdf.addSubsectionHeader('File Information');
  pdf.addKeyValue('Filename', importResult.filename);
  pdf.addKeyValue('File Size', formatFileSize(importResult.fileSize));
  pdf.addKeyValue('Import ID', importResult.importId);
  pdf.addKeyValue('Imported At', formatDate(importResult.importedAt));

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add statistics section
 */
function addStatisticsSection(pdf: HalcyonPDFGenerator, importResult: ImportResult): void {
  pdf.addSectionHeader('Import Statistics');

  // Key metrics
  const successRate =
    importResult.totalRows > 0
      ? (importResult.successCount / importResult.totalRows) * 100
      : 0;

  pdf.addMetricsBox([
    {
      label: 'Total Rows',
      value: importResult.totalRows.toLocaleString(),
    },
    {
      label: 'Successful',
      value: importResult.successCount.toLocaleString(),
      highlight: true,
    },
    {
      label: 'Failed',
      value: importResult.errorCount.toLocaleString(),
    },
    {
      label: 'Success Rate',
      value: formatPercentage(successRate),
    },
  ]);

  // Breakdown table
  const columns = [
    { header: 'Category', width: 40, align: 'left' as const },
    { header: 'Count', width: 30, align: 'right' as const },
    { header: 'Percentage', width: 30, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
  ];

  const rows = [
    {
      category: 'Successfully Imported',
      count: importResult.successCount,
      percentage: successRate,
    },
    {
      category: 'Errors (Skipped)',
      count: importResult.errorCount,
      percentage: importResult.totalRows > 0 ? (importResult.errorCount / importResult.totalRows) * 100 : 0,
    },
    {
      category: 'Warnings',
      count: importResult.warningCount,
      percentage: importResult.totalRows > 0 ? (importResult.warningCount / importResult.totalRows) * 100 : 0,
    },
  ];

  pdf.addTable(columns, rows);

  // Import summary statistics if available
  if (importResult.importSummary) {
    pdf.addSpacing(SPACING.md);
    pdf.addSubsectionHeader('Recovery Analysis Summary');

    pdf.addKeyValue('Total Estimated Recovery', formatCurrency(importResult.importSummary.totalRecovery));
    pdf.addKeyValue('Average Recovery/Case', formatCurrency(importResult.importSummary.averageRecovery));
    pdf.addKeyValue('Average Confidence', formatPercentage(importResult.importSummary.averageConfidence));

    // Pathway breakdown
    if (Object.keys(importResult.importSummary.byPathway).length > 0) {
      pdf.addSpacing(SPACING.sm);
      pdf.addParagraph('Cases by Pathway:', { bold: true });

      const pathwayColumns = [
        { header: 'Pathway', width: 60, align: 'left' as const },
        { header: 'Count', width: 20, align: 'right' as const },
        { header: '% of Total', width: 20, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
      ];

      const pathwayRows = Object.entries(importResult.importSummary.byPathway).map(
        ([pathway, count]) => ({
          pathway,
          count,
          '% of Total': importResult.successCount > 0 ? (count / importResult.successCount) * 100 : 0,
          '%oftotal': importResult.successCount > 0 ? (count / importResult.successCount) * 100 : 0,
        })
      );

      pdf.addTable(pathwayColumns, pathwayRows);
    }
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add error log section
 */
function addErrorLogSection(pdf: HalcyonPDFGenerator, importResult: ImportResult): void {
  pdf.addSectionHeader('Error Log');

  const errors = importResult.errors.filter((e) => e.severity === 'error');
  const warnings = importResult.errors.filter((e) => e.severity === 'warning');

  if (errors.length > 0) {
    pdf.addSubsectionHeader(`Errors (${errors.length})`);

    pdf.addParagraph(
      'The following rows could not be imported due to errors:',
      { color: HALCYON_COLORS.gray700 }
    );

    const errorColumns = [
      { header: 'Row', width: 10, align: 'center' as const },
      { header: 'Column', width: 20, align: 'left' as const },
      { header: 'Error Message', width: 70, align: 'left' as const },
    ];

    // Limit to first 20 errors to avoid very long reports
    const displayErrors = errors.slice(0, 20);
    const errorRows = displayErrors.map((e) => ({
      row: e.row,
      column: e.column || '-',
      'Error Message': e.message,
      errormessage: e.message,
    }));

    pdf.addTable(errorColumns, errorRows);

    if (errors.length > 20) {
      pdf.addParagraph(
        `... and ${errors.length - 20} more errors. See system logs for complete details.`,
        { color: HALCYON_COLORS.gray600, fontSize: FONT_SIZES.small }
      );
    }
  }

  if (warnings.length > 0) {
    pdf.addSpacing(SPACING.md);
    pdf.addSubsectionHeader(`Warnings (${warnings.length})`);

    pdf.addParagraph(
      'The following rows were imported but had warnings:',
      { color: HALCYON_COLORS.gray700 }
    );

    const warningColumns = [
      { header: 'Row', width: 10, align: 'center' as const },
      { header: 'Column', width: 20, align: 'left' as const },
      { header: 'Warning Message', width: 70, align: 'left' as const },
    ];

    // Limit to first 10 warnings
    const displayWarnings = warnings.slice(0, 10);
    const warningRows = displayWarnings.map((w) => ({
      row: w.row,
      column: w.column || '-',
      'Warning Message': w.message,
      warningmessage: w.message,
    }));

    pdf.addTable(warningColumns, warningRows);

    if (warnings.length > 10) {
      pdf.addParagraph(
        `... and ${warnings.length - 10} more warnings.`,
        { color: HALCYON_COLORS.gray600, fontSize: FONT_SIZES.small }
      );
    }
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add preview of imported cases section
 */
function addPreviewSection(
  pdf: HalcyonPDFGenerator,
  importResult: ImportResult,
  previewLimit: number
): void {
  pdf.addSectionHeader('Preview of Imported Cases');

  const previewCases = importResult.previewCases.slice(0, previewLimit);

  pdf.addParagraph(
    `Showing ${previewCases.length} of ${importResult.successCount} imported cases:`,
    { color: HALCYON_COLORS.gray700 }
  );

  pdf.addSpacing(SPACING.sm);

  const columns = [
    { header: '#', width: 6, align: 'center' as const },
    { header: 'Patient ID', width: 14, align: 'left' as const },
    { header: 'Account #', width: 12, align: 'left' as const },
    { header: 'DOS', width: 12, align: 'left' as const },
    { header: 'Charges', width: 14, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Recovery', width: 14, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Conf.', width: 10, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
    { header: 'Pathway', width: 18, align: 'left' as const },
  ];

  const rows = previewCases.map((c, index) => ({
    '#': index + 1,
    'Patient ID': c.patientIdentifier || c.id.substring(0, 8),
    patientid: c.patientIdentifier || c.id.substring(0, 8),
    'Account #': c.accountNumber || '-',
    'account#': c.accountNumber || '-',
    dos: c.input.dateOfService,
    charges: c.input.totalCharges,
    recovery: c.result.estimatedTotalRecovery,
    'Conf.': c.result.overallConfidence,
    'conf.': c.result.overallConfidence,
    pathway: c.result.primaryRecoveryPath.substring(0, 18),
  }));

  pdf.addTable(columns, rows);

  if (importResult.successCount > previewLimit) {
    pdf.addParagraph(
      `View all ${importResult.successCount} cases in the web application.`,
      { color: HALCYON_COLORS.gray600, fontSize: FONT_SIZES.small }
    );
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add recommended next steps section
 */
function addRecommendationsSection(pdf: HalcyonPDFGenerator, importResult: ImportResult): void {
  pdf.addSectionHeader('Recommended Next Steps');

  const recommendations: string[] = [];

  // Based on import status
  if (importResult.status === 'completed') {
    recommendations.push(
      'Review the imported cases in the web dashboard to validate data accuracy.'
    );
    recommendations.push(
      'Generate a worklist report to prioritize high-value recovery opportunities.'
    );
  } else if (importResult.status === 'partial') {
    recommendations.push(
      'Review the error log above to identify and correct data issues in the source file.'
    );
    recommendations.push(
      'Consider re-importing corrected rows after fixing data quality issues.'
    );
    recommendations.push(
      'Review successfully imported cases to ensure data accuracy.'
    );
  } else {
    recommendations.push(
      'Review the error log to identify the cause of the import failure.'
    );
    recommendations.push(
      'Verify the file format matches the expected template.'
    );
    recommendations.push(
      'Ensure all required columns are present and contain valid data.'
    );
    recommendations.push(
      'Contact support if issues persist after correcting the data.'
    );
  }

  // Based on summary statistics
  if (importResult.importSummary) {
    const avgRecovery = importResult.importSummary.averageRecovery;
    const avgConfidence = importResult.importSummary.averageConfidence;

    if (avgRecovery > 5000 && avgConfidence > 60) {
      recommendations.push(
        `High-value opportunities identified (avg ${formatCurrency(avgRecovery)}/case). ` +
          'Prioritize immediate review of these cases.'
      );
    }

    if (avgConfidence < 40) {
      recommendations.push(
        'Average confidence is below 40%. Additional patient data collection may improve accuracy.'
      );
    }
  }

  // Based on error rate
  if (importResult.errorCount > 0) {
    const errorRate = (importResult.errorCount / importResult.totalRows) * 100;
    if (errorRate > 10) {
      recommendations.push(
        `Error rate of ${formatPercentage(errorRate)} is above normal. ` +
          'Review source data quality and column mappings.'
      );
    }
  }

  pdf.addBulletList(recommendations);

  // Add support contact
  pdf.addSpacing(SPACING.md);
  pdf.addParagraph(
    'For assistance with data imports or to report issues, contact support@halcyon-rcm.com',
    { color: HALCYON_COLORS.gray600, fontSize: FONT_SIZES.small }
  );

  pdf.addSpacing(SPACING.lg);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status display color
 */
function getStatusColor(status: ImportResult['status']): string {
  switch (status) {
    case 'completed':
      return HALCYON_COLORS.success;
    case 'partial':
      return HALCYON_COLORS.warning;
    case 'failed':
      return HALCYON_COLORS.danger;
    default:
      return HALCYON_COLORS.gray700;
  }
}

/**
 * Format status for display
 */
function formatStatus(status: ImportResult['status']): string {
  switch (status) {
    case 'completed':
      return 'Completed Successfully';
    case 'partial':
      return 'Partially Completed (with errors)';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export default generateBatchSummary;
