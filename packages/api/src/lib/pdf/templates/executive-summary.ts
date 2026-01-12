/**
 * Executive Summary Report Template
 * Generates professional hospital-ready PDF reports with recovery opportunity analysis
 */

import { HalcyonPDFGenerator, formatCurrency, formatPercentage, formatDate } from '../pdf-generator.js';
import type {
  ExecutiveSummaryData,
  PathwayBreakdown,
  StateBreakdown,
  UrgencyBreakdown,
  TopOpportunity,
  ConfidenceRange,
} from '../types.js';
import { HALCYON_COLORS, SPACING, FONT_SIZES } from '../styles.js';

// ============================================================================
// EXECUTIVE SUMMARY DATA INTERFACE
// ============================================================================

export interface ExecutiveSummaryReportData {
  /** Organization information */
  organization: string;
  /** Report date range */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Key metrics summary */
  metrics: {
    totalCases: number;
    totalCharges: number;
    totalEstimatedRecovery: number;
    averageConfidence: number;
    averageRecoveryPerCase: number;
  };
  /** Recovery confidence range */
  confidenceRange?: ConfidenceRange;
  /** Breakdown by recovery pathway */
  pathwayBreakdown: PathwayBreakdown[];
  /** Breakdown by state */
  stateBreakdown: StateBreakdown[];
  /** Breakdown by urgency level */
  urgencyBreakdown: UrgencyBreakdown[];
  /** Top 10 highest recovery opportunities */
  topOpportunities: TopOpportunity[];
  /** Key insights and recommendations */
  keyInsights?: string[];
  /** Report generation timestamp */
  generatedAt: Date;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate an Executive Summary PDF report
 * @param data - Executive summary data
 * @returns Buffer containing the PDF
 */
export async function generateExecutiveSummary(data: ExecutiveSummaryReportData): Promise<Buffer> {
  const pdf = new HalcyonPDFGenerator({
    title: 'Recovery Opportunity Executive Summary',
    subtitle: `${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}`,
    organizationName: data.organization,
    showPageNumbers: true,
    confidential: true,
    footerText: 'Confidential - Halcyon RCM Partner Assistant',
  });

  // Add header
  pdf.addHeader();

  // Add key metrics summary
  addKeyMetricsSection(pdf, data);

  // Add confidence range if available
  if (data.confidenceRange) {
    addConfidenceRangeSection(pdf, data.confidenceRange);
  }

  // Add pathway breakdown
  addPathwayBreakdownSection(pdf, data.pathwayBreakdown);

  // Add state breakdown
  addStateBreakdownSection(pdf, data.stateBreakdown);

  // Add urgency distribution
  addUrgencyDistributionSection(pdf, data.urgencyBreakdown);

  // Add top opportunities
  addTopOpportunitiesSection(pdf, data.topOpportunities);

  // Add key insights if available
  if (data.keyInsights && data.keyInsights.length > 0) {
    addKeyInsightsSection(pdf, data.keyInsights);
  }

  // Generate and return buffer
  return pdf.generate();
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Add key metrics summary section
 */
function addKeyMetricsSection(pdf: HalcyonPDFGenerator, data: ExecutiveSummaryReportData): void {
  pdf.addSectionHeader('Key Metrics Summary');

  pdf.addMetricsBox([
    {
      label: 'Total Cases',
      value: data.metrics.totalCases.toLocaleString(),
    },
    {
      label: 'Total Estimated Recovery',
      value: formatCurrency(data.metrics.totalEstimatedRecovery),
      highlight: true,
    },
    {
      label: 'Average Confidence',
      value: formatPercentage(data.metrics.averageConfidence),
    },
    {
      label: 'Avg Recovery/Case',
      value: formatCurrency(data.metrics.averageRecoveryPerCase),
    },
  ]);

  // Add additional metrics
  pdf.addKeyValue('Total Charges Analyzed', formatCurrency(data.metrics.totalCharges));
  pdf.addKeyValue(
    'Recovery Rate',
    formatPercentage((data.metrics.totalEstimatedRecovery / data.metrics.totalCharges) * 100)
  );

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add confidence range section
 */
function addConfidenceRangeSection(pdf: HalcyonPDFGenerator, range: ConfidenceRange): void {
  pdf.addSubsectionHeader('Total Estimated Recovery with Confidence Ranges');

  pdf.addParagraph(
    `Based on the confidence levels of individual assessments, the total recovery opportunity is estimated within the following ranges:`
  );

  pdf.addSpacing(SPACING.sm);

  const columns = [
    { header: 'Scenario', width: 30, align: 'left' as const },
    { header: 'Estimated Recovery', width: 35, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Description', width: 35, align: 'left' as const },
  ];

  const rows = [
    {
      scenario: 'Low Estimate',
      'Estimated Recovery': range.low,
      estimatedrecovery: range.low,
      description: 'Conservative estimate (80% CI lower bound)',
    },
    {
      scenario: 'Expected',
      'Estimated Recovery': range.expected,
      estimatedrecovery: range.expected,
      description: 'Most likely recovery amount',
    },
    {
      scenario: 'High Estimate',
      'Estimated Recovery': range.high,
      estimatedrecovery: range.high,
      description: 'Optimistic estimate (80% CI upper bound)',
    },
  ];

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.md);
}

/**
 * Add pathway breakdown section
 */
function addPathwayBreakdownSection(pdf: HalcyonPDFGenerator, pathways: PathwayBreakdown[]): void {
  pdf.addSectionHeader('Recovery Breakdown by Pathway');

  if (pathways.length === 0) {
    pdf.addParagraph('No pathway data available.', { color: HALCYON_COLORS.gray600 });
    return;
  }

  const columns = [
    { header: 'Pathway', width: 25, align: 'left' as const },
    { header: 'Cases', width: 12, align: 'right' as const },
    { header: 'Est. Recovery', width: 20, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Avg/Case', width: 18, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Avg Confidence', width: 15, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
    { header: '% of Total', width: 10, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
  ];

  const rows = pathways.map((p) => ({
    pathway: p.pathway,
    cases: p.caseCount,
    'Est. Recovery': p.estimatedRecovery,
    estrecovery: p.estimatedRecovery,
    'Avg/Case': p.caseCount > 0 ? p.estimatedRecovery / p.caseCount : 0,
    'avg/case': p.caseCount > 0 ? p.estimatedRecovery / p.caseCount : 0,
    'Avg Confidence': p.caseCount > 0 ? (p.estimatedRecovery / p.totalCharges) * 100 : 0,
    avgconfidence: p.caseCount > 0 ? (p.estimatedRecovery / p.totalCharges) * 100 : 0,
    '% of Total': p.percentage,
    '%oftotal': p.percentage,
  }));

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add state breakdown section
 */
function addStateBreakdownSection(pdf: HalcyonPDFGenerator, states: StateBreakdown[]): void {
  pdf.addSectionHeader('Recovery Breakdown by State');

  if (states.length === 0) {
    pdf.addParagraph('No state data available.', { color: HALCYON_COLORS.gray600 });
    return;
  }

  // Sort by estimated recovery descending
  const sortedStates = [...states].sort((a, b) => b.estimatedRecovery - a.estimatedRecovery);

  const columns = [
    { header: 'State', width: 20, align: 'left' as const },
    { header: 'Cases', width: 15, align: 'right' as const },
    { header: 'Total Charges', width: 22, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Est. Recovery', width: 22, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: '% of Total', width: 21, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
  ];

  const rows = sortedStates.map((s) => ({
    state: s.state,
    cases: s.caseCount,
    'Total Charges': s.totalCharges,
    totalcharges: s.totalCharges,
    'Est. Recovery': s.estimatedRecovery,
    estrecovery: s.estimatedRecovery,
    '% of Total': s.percentage,
    '%oftotal': s.percentage,
  }));

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add urgency distribution section
 */
function addUrgencyDistributionSection(pdf: HalcyonPDFGenerator, urgency: UrgencyBreakdown[]): void {
  pdf.addSectionHeader('Urgency Distribution');

  if (urgency.length === 0) {
    pdf.addParagraph('No urgency data available.', { color: HALCYON_COLORS.gray600 });
    return;
  }

  pdf.addParagraph(
    'Cases are categorized by urgency based on recovery potential, confidence scores, and time sensitivity:'
  );

  pdf.addSpacing(SPACING.sm);

  const columns = [
    { header: 'Urgency Level', width: 25, align: 'left' as const },
    { header: 'Cases', width: 15, align: 'right' as const },
    { header: 'Total Charges', width: 20, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: '% of Cases', width: 20, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
    { header: 'Description', width: 20, align: 'left' as const },
  ];

  const urgencyDescriptions: Record<string, string> = {
    immediate: 'Act within 24-48 hours',
    critical: 'Act within 24-48 hours',
    high: 'Act within 1 week',
    medium: 'Act within 2-4 weeks',
    standard: 'Standard processing',
    low: 'Routine follow-up',
  };

  const rows = urgency.map((u) => ({
    'Urgency Level': u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    urgencylevel: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    cases: u.caseCount,
    'Total Charges': u.totalCharges,
    totalcharges: u.totalCharges,
    '% of Cases': u.percentage,
    '%ofcases': u.percentage,
    description: urgencyDescriptions[u.urgency.toLowerCase()] || 'Standard processing',
  }));

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add top opportunities section
 */
function addTopOpportunitiesSection(pdf: HalcyonPDFGenerator, opportunities: TopOpportunity[]): void {
  pdf.addSectionHeader('Top 10 Highest Recovery Opportunities');

  if (opportunities.length === 0) {
    pdf.addParagraph('No opportunities data available.', { color: HALCYON_COLORS.gray600 });
    return;
  }

  pdf.addParagraph(
    'The following cases represent the highest-value recovery opportunities and should be prioritized for immediate action:'
  );

  pdf.addSpacing(SPACING.sm);

  const columns = [
    { header: 'Rank', width: 8, align: 'center' as const },
    { header: 'Patient ID', width: 18, align: 'left' as const },
    { header: 'Account #', width: 16, align: 'left' as const },
    { header: 'Est. Recovery', width: 18, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Confidence', width: 14, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
    { header: 'Pathway', width: 16, align: 'left' as const },
    { header: 'State', width: 10, align: 'center' as const },
  ];

  const rows = opportunities.slice(0, 10).map((o, index) => ({
    rank: o.rank || index + 1,
    'Patient ID': o.patientIdentifier,
    patientid: o.patientIdentifier,
    'Account #': o.accountNumber || '-',
    'account#': o.accountNumber || '-',
    'Est. Recovery': o.estimatedRecovery,
    estrecovery: o.estimatedRecovery,
    confidence: o.confidence,
    pathway: o.primaryPathway,
    state: o.state,
  }));

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add key insights section
 */
function addKeyInsightsSection(pdf: HalcyonPDFGenerator, insights: string[]): void {
  pdf.addSectionHeader('Key Insights & Recommendations');

  pdf.addBulletList(insights);
  pdf.addSpacing(SPACING.md);
}

// ============================================================================
// CONVENIENCE FUNCTION FOR LEGACY DATA FORMAT
// ============================================================================

/**
 * Generate executive summary from ExecutiveSummaryData type
 * (Compatible with existing report controller data format)
 */
export async function generateExecutiveSummaryFromLegacy(data: ExecutiveSummaryData): Promise<Buffer> {
  const reportData: ExecutiveSummaryReportData = {
    organization: data.organization,
    dateRange: data.dateRange,
    metrics: {
      totalCases: data.totalCases,
      totalCharges: data.totalCharges,
      totalEstimatedRecovery: data.totalRecovery,
      averageConfidence: data.recoveryRate || (data.totalRecovery / data.totalCharges) * 100,
      averageRecoveryPerCase: data.totalCases > 0 ? data.totalRecovery / data.totalCases : 0,
    },
    pathwayBreakdown: data.pathwayBreakdown,
    stateBreakdown: data.stateBreakdown,
    urgencyBreakdown: data.urgencyBreakdown,
    topOpportunities: [], // Would need to be populated separately
    keyInsights: data.keyInsights,
    generatedAt: data.generatedAt,
  };

  return generateExecutiveSummary(reportData);
}

export default generateExecutiveSummary;
