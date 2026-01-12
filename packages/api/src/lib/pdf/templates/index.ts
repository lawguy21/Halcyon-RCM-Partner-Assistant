/**
 * PDF Report Templates Index
 * Exports all PDF report generation functions
 */

// Executive Summary Report
export {
  generateExecutiveSummary,
  generateExecutiveSummaryFromLegacy,
  type ExecutiveSummaryReportData,
} from './executive-summary.js';

// Detailed Assessment Report
export {
  generateDetailedAssessment,
  type ActionItem,
  type DocumentationItem,
  type TimelineEvent,
} from './detailed-assessment.js';

// Worklist Report
export {
  generateWorklistReport,
  type WorklistCase,
  type WorklistSummary,
} from './worklist-report.js';

// Batch Summary Report
export {
  generateBatchSummary,
  type BatchSummaryOptions,
} from './batch-summary.js';
