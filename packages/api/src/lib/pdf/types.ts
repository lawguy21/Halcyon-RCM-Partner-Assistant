/**
 * PDF Generation Types for Halcyon RCM Partner Assistant
 * Defines interfaces for PDF report generation
 */

import type { HospitalRecoveryInput, HospitalRecoveryResult } from '@halcyon-rcm/core';

/**
 * Font configuration for PDF documents
 */
export interface PDFFontConfig {
  /** Font family name */
  family: string;
  /** Font size in points */
  size: number;
  /** Font weight (normal, bold) */
  weight?: 'normal' | 'bold';
  /** Font style (normal, italic) */
  style?: 'normal' | 'italic';
}

/**
 * Color configuration for PDF documents
 */
export interface PDFColorConfig {
  /** Primary brand color */
  primary: string;
  /** Secondary brand color */
  secondary: string;
  /** Accent color for highlights */
  accent: string;
  /** Text color */
  text: string;
  /** Light text color for secondary content */
  textLight: string;
  /** Background color */
  background: string;
  /** Border color for tables and dividers */
  border: string;
  /** Success/positive indicator color */
  success: string;
  /** Warning indicator color */
  warning: string;
  /** Error/danger indicator color */
  danger: string;
}

/**
 * Configuration for PDF report generation
 */
export interface PDFReportConfig {
  /** Report title */
  title: string;
  /** Report subtitle (optional) */
  subtitle?: string;
  /** Logo image path or buffer (optional) */
  logo?: string | Buffer;
  /** Logo dimensions */
  logoDimensions?: {
    width: number;
    height: number;
  };
  /** Color configuration */
  colors: PDFColorConfig;
  /** Font configuration */
  fonts: {
    heading: PDFFontConfig;
    subheading: PDFFontConfig;
    body: PDFFontConfig;
    small: PDFFontConfig;
  };
  /** Page margins */
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** Include page numbers */
  showPageNumbers?: boolean;
  /** Include date stamp */
  showDateStamp?: boolean;
  /** Footer text */
  footerText?: string;
}

/**
 * Style configuration for table cells
 */
export interface PDFTableCellStyle {
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Font weight */
  fontWeight?: 'normal' | 'bold';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Padding */
  padding?: number;
}

/**
 * Configuration for PDF table generation
 */
export interface PDFTableConfig {
  /** Table headers */
  headers: string[];
  /** Table data rows */
  rows: (string | number)[][];
  /** Column widths (percentages or fixed values) */
  columnWidths?: number[];
  /** Header styles */
  headerStyle?: PDFTableCellStyle;
  /** Body cell styles */
  bodyStyle?: PDFTableCellStyle;
  /** Alternating row colors */
  alternateRowColor?: string;
  /** Show borders */
  showBorders?: boolean;
  /** Border color */
  borderColor?: string;
  /** Table width (percentage of page width) */
  tableWidth?: number;
}

/**
 * Pathway breakdown for executive summary
 */
export interface PathwayBreakdown {
  /** Pathway name (e.g., 'ProviderCompliance', 'DSH', 'CommercialPayer') */
  pathway: string;
  /** Number of cases in this pathway */
  caseCount: number;
  /** Total charges for this pathway */
  totalCharges: number;
  /** Estimated recovery for this pathway */
  estimatedRecovery: number;
  /** Percentage of total cases */
  percentage: number;
}

/**
 * State breakdown for executive summary
 */
export interface StateBreakdown {
  /** State code (e.g., 'CA', 'TX') */
  state: string;
  /** Number of cases in this state */
  caseCount: number;
  /** Total charges for this state */
  totalCharges: number;
  /** Estimated recovery for this state */
  estimatedRecovery: number;
  /** Percentage of total cases */
  percentage: number;
}

/**
 * Urgency breakdown for executive summary
 */
export interface UrgencyBreakdown {
  /** Urgency level (e.g., 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') */
  urgency: string;
  /** Number of cases at this urgency level */
  caseCount: number;
  /** Total charges for these cases */
  totalCharges: number;
  /** Percentage of total cases */
  percentage: number;
}

/**
 * Data structure for executive summary reports
 */
export interface ExecutiveSummaryData {
  /** Organization name */
  organization: string;
  /** Report date range */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Total number of cases analyzed */
  totalCases: number;
  /** Total charges across all cases */
  totalCharges: number;
  /** Total estimated recovery */
  totalRecovery: number;
  /** Recovery rate percentage */
  recoveryRate?: number;
  /** Breakdown by pathway */
  pathwayBreakdown: PathwayBreakdown[];
  /** Breakdown by state */
  stateBreakdown: StateBreakdown[];
  /** Breakdown by urgency */
  urgencyBreakdown: UrgencyBreakdown[];
  /** Key insights/highlights */
  keyInsights?: string[];
  /** Recommendations */
  recommendations?: string[];
  /** Report generated date */
  generatedAt: Date;
}

/**
 * Assessment score details
 */
export interface AssessmentScore {
  /** Overall score (0-100) */
  overall: number;
  /** Individual component scores */
  components?: {
    name: string;
    score: number;
    weight: number;
  }[];
  /** Score category (e.g., 'Excellent', 'Good', 'Fair', 'Poor') */
  category: string;
}

/**
 * Finding/issue identified in assessment
 */
export interface AssessmentFinding {
  /** Finding type/category */
  type: string;
  /** Finding description */
  description: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Recommended action */
  recommendation?: string;
  /** Potential impact */
  impact?: string;
}

/**
 * Data structure for detailed single case assessment PDF
 */
export interface DetailedAssessmentData {
  /** Case identifier */
  caseId: string;
  /** Patient information (de-identified as needed) */
  patient: {
    mrn?: string;
    accountNumber?: string;
    admitDate?: Date;
    dischargeDate?: Date;
    lengthOfStay?: number;
    patientType?: string;
    financialClass?: string;
  };
  /** Facility information */
  facility: {
    name: string;
    npi?: string;
    state?: string;
    type?: string;
  };
  /** Payer information */
  payer: {
    name: string;
    planType?: string;
    contractType?: string;
  };
  /** Financial details */
  financials: {
    totalCharges: number;
    expectedReimbursement?: number;
    actualPayment?: number;
    adjustments?: number;
    variance?: number;
    drgCode?: string;
    drgWeight?: number;
  };
  /** Assessment scores */
  scores: AssessmentScore;
  /** Recommended pathway */
  recommendedPathway: string;
  /** Pathway confidence score */
  pathwayConfidence: number;
  /** Assessment findings */
  findings: AssessmentFinding[];
  /** Recommended actions */
  recommendedActions: string[];
  /** Urgency level */
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Deadline for action */
  deadline?: Date;
  /** Assessment notes */
  notes?: string;
  /** Assessment timestamp */
  assessedAt: Date;
}

/**
 * Worklist item for prioritized case list
 */
export interface WorklistItem {
  /** Case identifier */
  caseId: string;
  /** Patient account number */
  accountNumber?: string;
  /** Facility name */
  facility: string;
  /** Payer name */
  payer: string;
  /** Total charges */
  totalCharges: number;
  /** Estimated recovery */
  estimatedRecovery: number;
  /** Recommended pathway */
  pathway: string;
  /** Urgency level */
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Priority score (for sorting) */
  priorityScore: number;
  /** Days until deadline */
  daysUntilDeadline?: number;
  /** Key findings summary */
  keyFindings?: string[];
  /** Status */
  status: string;
}

/**
 * Data structure for worklist/prioritized case report
 */
export interface WorklistReportData {
  /** Organization name */
  organization: string;
  /** Report title */
  title: string;
  /** Report date */
  reportDate: Date;
  /** Filter criteria applied */
  filters?: {
    pathways?: string[];
    states?: string[];
    urgencyLevels?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    minCharges?: number;
    maxCharges?: number;
  };
  /** Worklist items */
  items: WorklistItem[];
  /** Summary statistics */
  summary: {
    totalCases: number;
    totalCharges: number;
    totalEstimatedRecovery: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  /** Sorting criteria */
  sortedBy?: string;
  /** Report generated timestamp */
  generatedAt: Date;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  /** Label for the data point */
  label: string;
  /** Value */
  value: number;
  /** Optional color */
  color?: string;
}

/**
 * Bar chart configuration
 */
export interface BarChartConfig {
  /** Chart type */
  type: 'bar';
  /** Chart title */
  title?: string;
  /** Data points */
  data: ChartDataPoint[];
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Show values on bars */
  showValues?: boolean;
  /** Bar color (if not specified per data point) */
  barColor?: string;
}

/**
 * Pie chart configuration
 */
export interface PieChartConfig {
  /** Chart type */
  type: 'pie';
  /** Chart title */
  title?: string;
  /** Data points */
  data: ChartDataPoint[];
  /** Chart diameter */
  diameter?: number;
  /** Show percentages */
  showPercentages?: boolean;
  /** Show legend */
  showLegend?: boolean;
}

/**
 * Union type for all chart configurations
 */
export type ChartConfig = BarChartConfig | PieChartConfig;

/**
 * Section types for summary sections
 */
export type SummarySectionType =
  | 'keyMetrics'
  | 'pathwayBreakdown'
  | 'stateBreakdown'
  | 'urgencyBreakdown'
  | 'recommendations'
  | 'findings'
  | 'custom';

/**
 * Summary section configuration
 */
export interface SummarySectionConfig {
  /** Section type */
  type: SummarySectionType;
  /** Section title */
  title: string;
  /** Section content (varies by type) */
  content: unknown;
  /** Include chart */
  includeChart?: boolean;
  /** Chart configuration */
  chartConfig?: ChartConfig;
}

// ============================================================================
// ASSESSMENT TYPE (Core data structure with input and result)
// ============================================================================

/**
 * Full assessment with input, result, and metadata
 */
export interface Assessment {
  /** Unique identifier */
  id: string;
  /** Recovery calculation input */
  input: HospitalRecoveryInput;
  /** Recovery calculation result */
  result: HospitalRecoveryResult;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Optional tags for categorization */
  tags?: string[];
  /** User notes */
  notes?: string;
  /** Patient identifier (MRN, etc.) */
  patientIdentifier?: string;
  /** Account/encounter number */
  accountNumber?: string;
  /** Associated user ID */
  userId?: string;
  /** Associated organization ID */
  organizationId?: string;
  /** Import batch ID if from bulk import */
  importId?: string;
}

// ============================================================================
// WORKLIST OPTIONS
// ============================================================================

/**
 * Options for worklist report generation
 */
export interface WorklistOptions {
  /** Report title */
  title?: string;
  /** Sort field */
  sortBy?: 'urgency' | 'recovery' | 'confidence' | 'date';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Group cases by urgency level with page breaks */
  groupByUrgency?: boolean;
  /** Include action items for each case */
  includeActionItems?: boolean;
  /** Maximum number of cases to include */
  maxCases?: number;
  /** Filter criteria */
  filters?: {
    minRecovery?: number;
    minConfidence?: number;
    pathways?: string[];
    states?: string[];
    urgencyLevels?: ('immediate' | 'high' | 'standard')[];
  };
}

// ============================================================================
// IMPORT RESULT TYPES
// ============================================================================

/**
 * Error encountered during import
 */
export interface ImportError {
  /** Row number where error occurred (1-based) */
  row: number;
  /** Column name if applicable */
  column?: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity: 'error' | 'warning';
}

/**
 * Result of a batch import operation
 */
export interface ImportResult {
  /** Unique import identifier */
  importId: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  fileSize: number;
  /** Import timestamp */
  importedAt: Date;
  /** Total rows in source file */
  totalRows: number;
  /** Successfully imported count */
  successCount: number;
  /** Failed row count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Overall import status */
  status: 'completed' | 'partial' | 'failed';
  /** Error details */
  errors: ImportError[];
  /** Preview of successfully imported assessments */
  previewCases: Assessment[];
  /** Summary statistics for imported cases */
  importSummary?: {
    totalRecovery: number;
    averageRecovery: number;
    averageConfidence: number;
    byPathway: Record<string, number>;
  };
}

// ============================================================================
// CONFIDENCE RANGE
// ============================================================================

/**
 * Recovery estimate confidence range
 */
export interface ConfidenceRange {
  /** Low estimate */
  low: number;
  /** Expected/median estimate */
  expected: number;
  /** High estimate */
  high: number;
}

// ============================================================================
// TOP OPPORTUNITY
// ============================================================================

/**
 * High-value recovery opportunity
 */
export interface TopOpportunity {
  /** Rank in list */
  rank: number;
  /** Patient identifier */
  patientIdentifier: string;
  /** Account number */
  accountNumber?: string;
  /** Estimated recovery amount */
  estimatedRecovery: number;
  /** Confidence score */
  confidence: number;
  /** Primary recovery pathway */
  primaryPathway: string;
  /** State of service */
  state: string;
}
