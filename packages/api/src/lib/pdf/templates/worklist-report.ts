/**
 * Worklist Report Template
 * Generates prioritized worklist PDF reports sorted by urgency and recovery potential
 */

import { HalcyonPDFGenerator, formatCurrency, formatPercentage, formatDate } from '../pdf-generator.js';
import type { Assessment, WorklistOptions } from '../types.js';
import { HALCYON_COLORS, SPACING, FONT_SIZES, getUrgencyColor } from '../styles.js';

// ============================================================================
// TYPES
// ============================================================================

export interface WorklistCase {
  assessment: Assessment;
  urgencyLevel: 'immediate' | 'high' | 'standard';
  urgencyScore: number;
  rank: number;
  actionItems: string[];
  deadline?: string;
}

export interface WorklistSummary {
  totalCases: number;
  totalRecovery: number;
  averageConfidence: number;
  byUrgency: {
    immediate: { count: number; recovery: number };
    high: { count: number; recovery: number };
    standard: { count: number; recovery: number };
  };
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate a Prioritized Worklist PDF report
 * @param cases - Array of assessments to include in the worklist
 * @param options - Worklist generation options
 * @returns Buffer containing the PDF
 */
export async function generateWorklistReport(
  cases: Assessment[],
  options: WorklistOptions = {}
): Promise<Buffer> {
  // Process and sort cases
  const worklistCases = processAndSortCases(cases, options);
  const summary = calculateSummary(worklistCases);

  const pdf = new HalcyonPDFGenerator({
    title: options.title || 'Prioritized Recovery Worklist',
    subtitle: `Generated: ${formatDate(new Date())}`,
    showPageNumbers: true,
    confidential: true,
    footerText: 'Confidential - Halcyon RCM Partner Assistant',
  });

  // Add header
  pdf.addHeader();

  // Add summary statistics
  addSummarySection(pdf, summary);

  // Add worklist cases grouped by urgency if requested
  if (options.groupByUrgency !== false) {
    addGroupedWorklistSection(pdf, worklistCases, options);
  } else {
    addFlatWorklistSection(pdf, worklistCases, options);
  }

  // Generate and return buffer
  return pdf.generate();
}

// ============================================================================
// CASE PROCESSING
// ============================================================================

/**
 * Process assessments into worklist cases with urgency scoring
 */
function processAndSortCases(cases: Assessment[], options: WorklistOptions): WorklistCase[] {
  // Apply filters
  let filteredCases = [...cases];

  if (options.filters) {
    const { minRecovery, minConfidence, pathways, states, urgencyLevels } = options.filters;

    if (minRecovery !== undefined) {
      filteredCases = filteredCases.filter(
        (c) => c.result.estimatedTotalRecovery >= minRecovery
      );
    }

    if (minConfidence !== undefined) {
      filteredCases = filteredCases.filter(
        (c) => c.result.overallConfidence >= minConfidence
      );
    }

    if (pathways && pathways.length > 0) {
      filteredCases = filteredCases.filter((c) =>
        pathways.some((p) => c.result.primaryRecoveryPath.toLowerCase().includes(p.toLowerCase()))
      );
    }

    if (states && states.length > 0) {
      filteredCases = filteredCases.filter((c) =>
        states.includes(c.input.stateOfService) || states.includes(c.input.facilityState)
      );
    }
  }

  // Calculate urgency scores and levels
  const worklistCases: WorklistCase[] = filteredCases.map((assessment) => {
    const urgencyScore = calculateUrgencyScore(assessment);
    const urgencyLevel = determineUrgencyLevel(assessment);
    const actionItems = getActionItems(assessment);
    const deadline = calculateDeadline(urgencyLevel);

    return {
      assessment,
      urgencyLevel,
      urgencyScore,
      rank: 0, // Will be assigned after sorting
      actionItems,
      deadline,
    };
  });

  // Filter by urgency levels if specified
  if (options.filters?.urgencyLevels && options.filters.urgencyLevels.length > 0) {
    const allowedLevels = options.filters.urgencyLevels;
    worklistCases.filter((c) => allowedLevels.includes(c.urgencyLevel));
  }

  // Sort cases
  const sortBy = options.sortBy || 'urgency';
  const sortOrder = options.sortOrder || 'desc';

  worklistCases.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'urgency':
        comparison = a.urgencyScore - b.urgencyScore;
        break;
      case 'recovery':
        comparison =
          a.assessment.result.estimatedTotalRecovery -
          b.assessment.result.estimatedTotalRecovery;
        break;
      case 'confidence':
        comparison =
          a.assessment.result.overallConfidence - b.assessment.result.overallConfidence;
        break;
      case 'date':
        comparison =
          new Date(a.assessment.createdAt).getTime() -
          new Date(b.assessment.createdAt).getTime();
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Apply max cases limit
  const maxCases = options.maxCases || worklistCases.length;
  const limitedCases = worklistCases.slice(0, maxCases);

  // Assign ranks
  limitedCases.forEach((c, index) => {
    c.rank = index + 1;
  });

  return limitedCases;
}

/**
 * Calculate urgency score (0-100, higher = more urgent)
 */
function calculateUrgencyScore(assessment: Assessment): number {
  const result = assessment.result;
  const input = assessment.input;

  let score = 0;

  // Recovery potential component (0-40 points)
  const recoveryNormalized = Math.min(result.estimatedTotalRecovery / 25000, 1);
  score += recoveryNormalized * 40;

  // Confidence component (0-30 points)
  score += (result.overallConfidence / 100) * 30;

  // Time sensitivity component (0-30 points)
  const dosDate = new Date(input.dateOfService);
  const today = new Date();
  const daysSinceDOS = Math.floor((today.getTime() - dosDate.getTime()) / (1000 * 60 * 60 * 24));

  // Higher urgency for recent cases (eligibility deadlines)
  if (daysSinceDOS <= 30) {
    score += 30;
  } else if (daysSinceDOS <= 60) {
    score += 20;
  } else if (daysSinceDOS <= 90) {
    score += 10;
  }

  return Math.round(score);
}

/**
 * Determine urgency level from score and other factors
 */
function determineUrgencyLevel(assessment: Assessment): 'immediate' | 'high' | 'standard' {
  const result = assessment.result;
  const score = result.estimatedTotalRecovery * (result.overallConfidence / 100);

  // Check for immediate action indicators
  if (result.immediateActions.length > 0 && score >= 10000 && result.overallConfidence >= 80) {
    return 'immediate';
  }

  if (score >= 5000 && result.overallConfidence >= 60) {
    return 'high';
  }

  return 'standard';
}

/**
 * Get action items for a case
 */
function getActionItems(assessment: Assessment): string[] {
  const result = assessment.result;
  const actions: string[] = [];

  // Add immediate actions first
  actions.push(...result.immediateActions.slice(0, 2));

  // Add priority actions
  actions.push(...result.priorityActions.slice(0, 2));

  return actions.slice(0, 3); // Return max 3 actions
}

/**
 * Calculate deadline based on urgency level
 */
function calculateDeadline(urgencyLevel: 'immediate' | 'high' | 'standard'): string {
  const today = new Date();
  let deadline: Date;

  switch (urgencyLevel) {
    case 'immediate':
      deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 2);
      break;
    case 'high':
      deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 7);
      break;
    case 'standard':
      deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 30);
      break;
  }

  return formatDate(deadline);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(cases: WorklistCase[]): WorklistSummary {
  const byUrgency = {
    immediate: { count: 0, recovery: 0 },
    high: { count: 0, recovery: 0 },
    standard: { count: 0, recovery: 0 },
  };

  let totalRecovery = 0;
  let totalConfidence = 0;

  for (const worklistCase of cases) {
    const recovery = worklistCase.assessment.result.estimatedTotalRecovery;
    const confidence = worklistCase.assessment.result.overallConfidence;

    totalRecovery += recovery;
    totalConfidence += confidence;

    byUrgency[worklistCase.urgencyLevel].count++;
    byUrgency[worklistCase.urgencyLevel].recovery += recovery;
  }

  return {
    totalCases: cases.length,
    totalRecovery,
    averageConfidence: cases.length > 0 ? Math.round(totalConfidence / cases.length) : 0,
    byUrgency,
  };
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Add summary statistics section
 */
function addSummarySection(pdf: HalcyonPDFGenerator, summary: WorklistSummary): void {
  pdf.addSectionHeader('Summary Statistics');

  // Key metrics
  pdf.addMetricsBox([
    {
      label: 'Total Cases',
      value: summary.totalCases.toLocaleString(),
    },
    {
      label: 'Total Recovery',
      value: formatCurrency(summary.totalRecovery),
      highlight: true,
    },
    {
      label: 'Avg Confidence',
      value: formatPercentage(summary.averageConfidence),
    },
    {
      label: 'Avg/Case',
      value: formatCurrency(summary.totalCases > 0 ? summary.totalRecovery / summary.totalCases : 0),
    },
  ]);

  // Urgency breakdown
  const columns = [
    { header: 'Urgency Level', width: 25, align: 'left' as const },
    { header: 'Cases', width: 20, align: 'right' as const },
    { header: 'Total Recovery', width: 30, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: '% of Cases', width: 25, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
  ];

  const rows = [
    {
      'Urgency Level': 'Immediate',
      urgencylevel: 'Immediate',
      cases: summary.byUrgency.immediate.count,
      'Total Recovery': summary.byUrgency.immediate.recovery,
      totalrecovery: summary.byUrgency.immediate.recovery,
      '% of Cases': summary.totalCases > 0 ? (summary.byUrgency.immediate.count / summary.totalCases) * 100 : 0,
      '%ofcases': summary.totalCases > 0 ? (summary.byUrgency.immediate.count / summary.totalCases) * 100 : 0,
    },
    {
      'Urgency Level': 'High',
      urgencylevel: 'High',
      cases: summary.byUrgency.high.count,
      'Total Recovery': summary.byUrgency.high.recovery,
      totalrecovery: summary.byUrgency.high.recovery,
      '% of Cases': summary.totalCases > 0 ? (summary.byUrgency.high.count / summary.totalCases) * 100 : 0,
      '%ofcases': summary.totalCases > 0 ? (summary.byUrgency.high.count / summary.totalCases) * 100 : 0,
    },
    {
      'Urgency Level': 'Standard',
      urgencylevel: 'Standard',
      cases: summary.byUrgency.standard.count,
      'Total Recovery': summary.byUrgency.standard.recovery,
      totalrecovery: summary.byUrgency.standard.recovery,
      '% of Cases': summary.totalCases > 0 ? (summary.byUrgency.standard.count / summary.totalCases) * 100 : 0,
      '%ofcases': summary.totalCases > 0 ? (summary.byUrgency.standard.count / summary.totalCases) * 100 : 0,
    },
  ];

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add worklist grouped by urgency with page breaks
 */
function addGroupedWorklistSection(
  pdf: HalcyonPDFGenerator,
  cases: WorklistCase[],
  options: WorklistOptions
): void {
  const urgencyOrder: Array<'immediate' | 'high' | 'standard'> = ['immediate', 'high', 'standard'];

  for (const urgencyLevel of urgencyOrder) {
    const levelCases = cases.filter((c) => c.urgencyLevel === urgencyLevel);

    if (levelCases.length === 0) continue;

    // Add page break between urgency levels (except for the first one)
    if (urgencyLevel !== 'immediate' || cases[0]?.urgencyLevel !== 'immediate') {
      pdf.addPage();
    }

    // Section header with urgency level
    const levelName = urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1);
    pdf.addSectionHeader(`${levelName} Priority Cases (${levelCases.length})`);

    // Add urgency badge
    pdf.addUrgencyBadge(urgencyLevel.toUpperCase());

    // Add deadline note
    const deadlineNote = getDeadlineNote(urgencyLevel);
    pdf.addParagraph(deadlineNote, { color: HALCYON_COLORS.gray700, fontSize: FONT_SIZES.small });

    pdf.addSpacing(SPACING.sm);

    // Add cases table
    addCasesTable(pdf, levelCases, options);
  }
}

/**
 * Add flat worklist (not grouped)
 */
function addFlatWorklistSection(
  pdf: HalcyonPDFGenerator,
  cases: WorklistCase[],
  options: WorklistOptions
): void {
  pdf.addSectionHeader('Prioritized Worklist');

  if (cases.length === 0) {
    pdf.addParagraph('No cases match the specified criteria.', { color: HALCYON_COLORS.gray600 });
    return;
  }

  addCasesTable(pdf, cases, options);
}

/**
 * Add cases table
 */
function addCasesTable(
  pdf: HalcyonPDFGenerator,
  cases: WorklistCase[],
  options: WorklistOptions
): void {
  const includeActions = options.includeActionItems !== false;

  const columns = [
    { header: 'Rank', width: 8, align: 'center' as const },
    { header: 'Patient ID', width: 14, align: 'left' as const },
    { header: 'Account #', width: 12, align: 'left' as const },
    { header: 'Recovery', width: 14, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: 'Conf.', width: 10, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
    { header: 'Pathway', width: 14, align: 'left' as const },
    { header: 'State', width: 8, align: 'center' as const },
    { header: 'Deadline', width: 12, align: 'left' as const },
    ...(includeActions ? [{ header: 'Actions', width: 8, align: 'center' as const }] : []),
  ];

  const rows = cases.map((c) => ({
    rank: c.rank,
    'Patient ID': c.assessment.patientIdentifier || c.assessment.id.substring(0, 8),
    patientid: c.assessment.patientIdentifier || c.assessment.id.substring(0, 8),
    'Account #': c.assessment.accountNumber || '-',
    'account#': c.assessment.accountNumber || '-',
    recovery: c.assessment.result.estimatedTotalRecovery,
    'Conf.': c.assessment.result.overallConfidence,
    'conf.': c.assessment.result.overallConfidence,
    pathway: c.assessment.result.primaryRecoveryPath.substring(0, 15),
    state: c.assessment.input.stateOfService,
    deadline: c.deadline || '-',
    ...(includeActions ? { actions: c.actionItems.length } : {}),
  }));

  pdf.addTable(columns, rows);

  // Add action items detail if enabled
  if (includeActions && cases.some((c) => c.actionItems.length > 0)) {
    pdf.addSpacing(SPACING.md);
    pdf.addSubsectionHeader('Action Items by Case');

    for (const worklistCase of cases) {
      if (worklistCase.actionItems.length === 0) continue;

      const identifier =
        worklistCase.assessment.patientIdentifier ||
        worklistCase.assessment.id.substring(0, 8);

      pdf.addParagraph(`#${worklistCase.rank} - ${identifier}:`, {
        bold: true,
        fontSize: FONT_SIZES.body,
      });
      pdf.addBulletList(worklistCase.actionItems);
    }
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Get deadline note for urgency level
 */
function getDeadlineNote(urgencyLevel: 'immediate' | 'high' | 'standard'): string {
  switch (urgencyLevel) {
    case 'immediate':
      return 'These cases require action within 24-48 hours. High recovery potential with strong confidence.';
    case 'high':
      return 'These cases should be addressed within 1 week. Significant recovery opportunity identified.';
    case 'standard':
      return 'Standard priority cases to be processed within 30 days.';
  }
}

export default generateWorklistReport;
