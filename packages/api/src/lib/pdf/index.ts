/**
 * PDF Generation Library for Halcyon RCM Partner Assistant
 *
 * This module provides comprehensive PDF generation capabilities for creating
 * professional healthcare revenue cycle reports with consistent Halcyon branding.
 *
 * @example
 * ```typescript
 * import { createPDFGenerator, formatCurrency } from './lib/pdf';
 *
 * const pdf = createPDFGenerator({
 *   title: 'Executive Summary',
 *   subtitle: 'Q4 2024 Recovery Analysis',
 * });
 *
 * pdf.addHeader()
 *    .addSectionHeader('Key Metrics')
 *    .addMetricsBox([
 *      { label: 'Total Cases', value: '1,234' },
 *      { label: 'Est. Recovery', value: formatCurrency(2500000) },
 *    ])
 *    .addTable(columns, rows);
 *
 * const buffer = await pdf.generate();
 * ```
 */

// Export types
export type {
  PDFFontConfig,
  PDFColorConfig,
  PDFReportConfig,
  PDFTableCellStyle,
  PDFTableConfig,
  PathwayBreakdown,
  StateBreakdown,
  UrgencyBreakdown,
  ExecutiveSummaryData,
  AssessmentScore,
  AssessmentFinding,
  DetailedAssessmentData,
  WorklistItem,
  WorklistReportData,
  ChartDataPoint,
  BarChartConfig,
  PieChartConfig,
  ChartConfig,
  SummarySectionType,
  SummarySectionConfig,
  Assessment,
  WorklistOptions,
  ImportError,
  ImportResult,
  ConfidenceRange,
  TopOpportunity,
} from './types.js';

// Export styles and constants
export {
  HALCYON_COLORS,
  DEFAULT_COLORS,
  FONT_SIZES,
  DEFAULT_FONTS,
  PAGE_MARGINS,
  PAGE_DIMENSIONS,
  SPACING,
  TABLE_HEADER_STYLE,
  TABLE_BODY_STYLE,
  TABLE_ALTERNATE_ROW_COLOR,
  TABLE_BORDER_COLOR,
  HEADER_STYLES,
  FOOTER_STYLES,
  CHART_COLORS,
  CHART_STYLES,
  URGENCY_BADGE_STYLES,
  SECTION_STYLES,
  DEFAULT_REPORT_CONFIG,
  getUrgencyColor,
  hexToRgb,
  lightenColor,
  darkenColor,
  formatCurrency,
  formatPercentage,
  formatDate,
  formatDateRange,
} from './styles.js';

// Export PDF generator class and factory function
export {
  HalcyonPDFGenerator,
  createPDFGenerator,
} from './pdf-generator.js';

// Re-export types from pdf-generator for convenience
export type {
  PDFGeneratorOptions,
  TableColumn,
  TableRow,
} from './pdf-generator.js';

// Export PDF report templates
export {
  // Executive Summary Report
  generateExecutiveSummary,
  generateExecutiveSummaryFromLegacy,
  type ExecutiveSummaryReportData,
  // Detailed Assessment Report
  generateDetailedAssessment,
  type ActionItem,
  type DocumentationItem,
  type TimelineEvent,
  // Worklist Report
  generateWorklistReport,
  type WorklistCase,
  type WorklistSummary,
  // Batch Summary Report
  generateBatchSummary,
  type BatchSummaryOptions,
} from './templates/index.js';
