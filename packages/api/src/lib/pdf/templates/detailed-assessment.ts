// @ts-nocheck
/**
 * Detailed Assessment Report Template
 * Generates comprehensive single-case PDF reports with recovery pathway analysis
 */

import { HalcyonPDFGenerator, formatCurrency, formatPercentage, formatDate } from '../pdf-generator.js';
import type { Assessment } from '../types.js';
import { HALCYON_COLORS, SPACING, FONT_SIZES, getUrgencyColor } from '../styles.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionItem {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: string;
  notes?: string;
}

export interface DocumentationItem {
  document: string;
  status: 'required' | 'recommended' | 'obtained';
  notes?: string;
}

export interface TimelineEvent {
  date: string;
  event: string;
  type: 'milestone' | 'deadline' | 'followup';
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate a Detailed Assessment PDF report for a single case
 * @param assessment - The assessment to generate report for
 * @returns Buffer containing the PDF
 */
export async function generateDetailedAssessment(assessment: Assessment): Promise<Buffer> {
  const pdf = new HalcyonPDFGenerator({
    title: 'Detailed Recovery Assessment',
    subtitle: `Case ID: ${assessment.id.substring(0, 8)}...`,
    showPageNumbers: true,
    confidential: true,
    footerText: 'Confidential - Halcyon RCM Partner Assistant',
  });

  // Add header
  pdf.addHeader();

  // Add patient/account information section
  addPatientAccountSection(pdf, assessment);

  // Add recovery summary section
  addRecoverySummarySection(pdf, assessment);

  // Add pathway analysis section
  addPathwayAnalysisSection(pdf, assessment);

  // Add recommended actions section
  addRecommendedActionsSection(pdf, assessment);

  // Add documentation checklist section
  addDocumentationChecklistSection(pdf, assessment);

  // Add timeline/follow-up section
  addTimelineSection(pdf, assessment);

  // Add notes section if available
  if (assessment.notes) {
    addNotesSection(pdf, assessment.notes);
  }

  // Generate and return buffer
  return pdf.generate();
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Add patient and account information section
 */
function addPatientAccountSection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Patient/Account Information');

  const input = assessment.input;

  // Two-column layout for key information
  pdf.addKeyValue('Patient Identifier', assessment.patientIdentifier || 'Not provided');
  pdf.addKeyValue('Account Number', assessment.accountNumber || 'Not provided');
  pdf.addDivider();

  pdf.addKeyValue('Date of Service', input.dateOfService);
  pdf.addKeyValue('Encounter Type', formatEncounterType(input.encounterType));
  if (input.lengthOfStay) {
    pdf.addKeyValue('Length of Stay', `${input.lengthOfStay} days`);
  }
  pdf.addDivider();

  pdf.addKeyValue('State of Residence', input.stateOfResidence);
  pdf.addKeyValue('State of Service', input.stateOfService);
  pdf.addKeyValue('Facility State', input.facilityState);
  pdf.addKeyValue('Facility Type', formatFacilityType(input.facilityType));
  pdf.addDivider();

  pdf.addKeyValue('Insurance Status on DOS', formatInsuranceStatus(input.insuranceStatusOnDOS));
  pdf.addKeyValue('Total Charges', formatCurrency(input.totalCharges));

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add recovery summary section
 */
function addRecoverySummarySection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Recovery Summary');

  const result = assessment.result;

  // Key metrics box
  pdf.addMetricsBox([
    {
      label: 'Estimated Recovery',
      value: formatCurrency(result.estimatedTotalRecovery),
      highlight: true,
    },
    {
      label: 'Overall Confidence',
      value: formatPercentage(result.overallConfidence),
    },
    {
      label: 'Current Exposure',
      value: formatCurrency(result.currentExposure),
    },
  ]);

  // Primary recovery path with urgency
  pdf.addSubsectionHeader('Primary Recovery Pathway');

  const urgency = determineUrgency(result);
  pdf.addUrgencyBadge(urgency);

  pdf.addKeyValue('Recommended Pathway', result.primaryRecoveryPath);

  // Projected recovery breakdown
  pdf.addSpacing(SPACING.sm);
  pdf.addSubsectionHeader('Projected Recovery Breakdown');

  const columns = [
    { header: 'Source', width: 40, align: 'left' as const },
    { header: 'Amount', width: 30, align: 'right' as const, format: (v: unknown) => formatCurrency(Number(v)) },
    { header: '% of Total', width: 30, align: 'right' as const, format: (v: unknown) => formatPercentage(Number(v)) },
  ];

  const totalRecovery = result.projectedRecovery.total || result.estimatedTotalRecovery;
  const rows = [
    {
      source: 'Medicaid Recovery',
      amount: result.projectedRecovery.medicaid,
      '% of Total': totalRecovery > 0 ? (result.projectedRecovery.medicaid / totalRecovery) * 100 : 0,
      '%oftotal': totalRecovery > 0 ? (result.projectedRecovery.medicaid / totalRecovery) * 100 : 0,
    },
    {
      source: 'State Program Recovery',
      amount: result.projectedRecovery.stateProgram,
      '% of Total': totalRecovery > 0 ? (result.projectedRecovery.stateProgram / totalRecovery) * 100 : 0,
      '%oftotal': totalRecovery > 0 ? (result.projectedRecovery.stateProgram / totalRecovery) * 100 : 0,
    },
    {
      source: 'Charity Writeoff Value',
      amount: result.projectedRecovery.charityWriteoff,
      '% of Total': totalRecovery > 0 ? (result.projectedRecovery.charityWriteoff / totalRecovery) * 100 : 0,
      '%oftotal': totalRecovery > 0 ? (result.projectedRecovery.charityWriteoff / totalRecovery) * 100 : 0,
    },
  ];

  pdf.addTable(columns, rows);
  pdf.addSpacing(SPACING.lg);
}

/**
 * Add pathway analysis section
 */
function addPathwayAnalysisSection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Recovery Pathway Analysis');

  const result = assessment.result;

  // Medicaid Analysis
  pdf.addSubsectionHeader('Medicaid Recovery Analysis');
  pdf.addKeyValue('Status', formatMedicaidStatus(result.medicaid.status));
  pdf.addKeyValue('Confidence', formatPercentage(result.medicaid.confidence));
  pdf.addKeyValue('Pathway', result.medicaid.pathway);
  pdf.addKeyValue('Estimated Recovery', formatCurrency(result.medicaid.estimatedRecovery));
  pdf.addKeyValue('Timeline', result.medicaid.timelineWeeks);

  if (result.medicaid.actions.length > 0) {
    pdf.addSpacing(SPACING.xs);
    pdf.addParagraph('Required Actions:', { bold: true, fontSize: FONT_SIZES.body });
    pdf.addBulletList(result.medicaid.actions);
  }

  if (result.medicaid.notes.length > 0) {
    pdf.addParagraph('Notes:', { bold: true, fontSize: FONT_SIZES.body });
    pdf.addBulletList(result.medicaid.notes);
  }

  pdf.addDivider();

  // Medicare Analysis
  pdf.addSubsectionHeader('Medicare Recovery Analysis');
  pdf.addKeyValue('Status', formatMedicareStatus(result.medicare.status));
  pdf.addKeyValue('Confidence', formatPercentage(result.medicare.confidence));
  pdf.addKeyValue('Pathway', result.medicare.pathway);
  if (result.medicare.estimatedTimeToEligibility) {
    pdf.addKeyValue('Est. Time to Eligibility', result.medicare.estimatedTimeToEligibility);
  }

  if (result.medicare.actions.length > 0) {
    pdf.addSpacing(SPACING.xs);
    pdf.addParagraph('Required Actions:', { bold: true, fontSize: FONT_SIZES.body });
    pdf.addBulletList(result.medicare.actions);
  }

  pdf.addDivider();

  // DSH Relevance Analysis
  pdf.addSubsectionHeader('DSH Relevance Analysis');
  pdf.addKeyValue('Relevance', result.dshRelevance.relevance.toUpperCase());
  pdf.addKeyValue('Score', `${result.dshRelevance.score}/100`);
  pdf.addKeyValue('Audit Readiness', result.dshRelevance.auditReadiness);

  if (result.dshRelevance.factors.length > 0) {
    pdf.addSpacing(SPACING.xs);
    pdf.addParagraph('Key Factors:', { bold: true, fontSize: FONT_SIZES.body });
    const factorList = result.dshRelevance.factors.map(
      (f) => `${f.factor} (${f.impact}, weight: ${f.weight})`
    );
    pdf.addBulletList(factorList);
  }

  pdf.addDivider();

  // State Program Analysis
  pdf.addSubsectionHeader('State Program Analysis');
  pdf.addKeyValue('Program Name', result.stateProgram.programName);
  pdf.addKeyValue('Archetype', result.stateProgram.archetype);
  pdf.addKeyValue('Confidence', formatPercentage(result.stateProgram.confidence));
  pdf.addKeyValue('Eligibility Likely', result.stateProgram.eligibilityLikely ? 'Yes' : 'No');
  pdf.addKeyValue('Est. Recovery %', formatPercentage(result.stateProgram.estimatedRecoveryPercent));

  if (result.stateProgram.requiredDocuments.length > 0) {
    pdf.addSpacing(SPACING.xs);
    pdf.addParagraph('Required Documents:', { bold: true, fontSize: FONT_SIZES.body });
    pdf.addBulletList(result.stateProgram.requiredDocuments);
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add recommended actions section
 */
function addRecommendedActionsSection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Recommended Actions');

  const result = assessment.result;

  // Priority Actions
  if (result.priorityActions.length > 0) {
    pdf.addSubsectionHeader('Priority Actions');
    pdf.addParagraph(
      'The following actions should be completed first to maximize recovery opportunity:',
      { color: HALCYON_COLORS.gray700 }
    );

    const priorityColumns = [
      { header: 'Priority', width: 15, align: 'center' as const },
      { header: 'Action', width: 85, align: 'left' as const },
    ];

    const priorityRows = result.priorityActions.map((action, index) => ({
      priority: index + 1,
      action: action,
    }));

    pdf.addTable(priorityColumns, priorityRows);
  }

  // Immediate Actions
  if (result.immediateActions.length > 0) {
    pdf.addSubsectionHeader('Immediate Actions');
    pdf.addParagraph(
      'These actions require immediate attention (within 24-48 hours):',
      { color: HALCYON_COLORS.gray700 }
    );
    pdf.addBulletList(result.immediateActions);
  }

  // Follow-up Actions
  if (result.followUpActions.length > 0) {
    pdf.addSubsectionHeader('Follow-up Actions');
    pdf.addParagraph(
      'Schedule these actions for follow-up within the next 1-2 weeks:',
      { color: HALCYON_COLORS.gray700 }
    );
    pdf.addBulletList(result.followUpActions);
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add documentation checklist section
 */
function addDocumentationChecklistSection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Supporting Documentation Checklist');

  const result = assessment.result;

  if (result.documentationNeeded.length === 0) {
    pdf.addParagraph('No specific documentation requirements identified.', { color: HALCYON_COLORS.gray600 });
    pdf.addSpacing(SPACING.lg);
    return;
  }

  pdf.addParagraph(
    'The following documents should be gathered to support the recovery process:',
    { color: HALCYON_COLORS.gray700 }
  );

  const columns = [
    { header: 'Document', width: 60, align: 'left' as const },
    { header: 'Status', width: 20, align: 'center' as const },
    { header: 'Priority', width: 20, align: 'center' as const },
  ];

  const rows = result.documentationNeeded.map((doc, index) => ({
    document: doc,
    status: '[ ] Pending',
    priority: index < 3 ? 'High' : 'Standard',
  }));

  pdf.addTable(columns, rows);

  // Add state program specific documents if available
  if (result.stateProgram.requiredDocuments.length > 0) {
    pdf.addSubsectionHeader('State Program Specific Documents');
    pdf.addBulletList(result.stateProgram.requiredDocuments);
  }

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add timeline and follow-up section
 */
function addTimelineSection(pdf: HalcyonPDFGenerator, assessment: Assessment): void {
  pdf.addSectionHeader('Timeline for Follow-up');

  const result = assessment.result;
  const today = new Date();

  // Create timeline based on result data
  const timelineEvents: TimelineEvent[] = [];

  // Add immediate action deadline
  if (result.immediateActions.length > 0) {
    const immediateDue = new Date(today);
    immediateDue.setDate(immediateDue.getDate() + 2);
    timelineEvents.push({
      date: formatDate(immediateDue),
      event: 'Complete immediate actions',
      type: 'deadline',
    });
  }

  // Add follow-up deadline
  if (result.followUpActions.length > 0) {
    const followUpDue = new Date(today);
    followUpDue.setDate(followUpDue.getDate() + 14);
    timelineEvents.push({
      date: formatDate(followUpDue),
      event: 'Complete follow-up actions',
      type: 'followup',
    });
  }

  // Add Medicaid timeline if applicable
  if (result.medicaid.timelineWeeks && result.medicaid.status !== 'unlikely') {
    const medicaidTarget = new Date(today);
    const weeks = parseInt(result.medicaid.timelineWeeks.split('-')[1]) || 8;
    medicaidTarget.setDate(medicaidTarget.getDate() + weeks * 7);
    timelineEvents.push({
      date: formatDate(medicaidTarget),
      event: `Medicaid determination expected (${result.medicaid.timelineWeeks})`,
      type: 'milestone',
    });
  }

  // Display timeline
  if (timelineEvents.length === 0) {
    pdf.addParagraph('No specific timeline events identified.', { color: HALCYON_COLORS.gray600 });
  } else {
    const columns = [
      { header: 'Target Date', width: 25, align: 'left' as const },
      { header: 'Event', width: 55, align: 'left' as const },
      { header: 'Type', width: 20, align: 'center' as const },
    ];

    const rows = timelineEvents.map((event) => ({
      'Target Date': event.date,
      targetdate: event.date,
      event: event.event,
      type: event.type.charAt(0).toUpperCase() + event.type.slice(1),
    }));

    pdf.addTable(columns, rows);
  }

  // Add case age information
  pdf.addSpacing(SPACING.sm);
  const dosDate = new Date(assessment.input.dateOfService);
  const daysSinceDOS = Math.floor((today.getTime() - dosDate.getTime()) / (1000 * 60 * 60 * 24));
  pdf.addKeyValue('Days Since Service', `${daysSinceDOS} days`);
  pdf.addKeyValue('Assessment Created', formatDate(assessment.createdAt));
  pdf.addKeyValue('Last Updated', formatDate(assessment.updatedAt));

  pdf.addSpacing(SPACING.lg);
}

/**
 * Add notes section
 */
function addNotesSection(pdf: HalcyonPDFGenerator, notes: string): void {
  pdf.addSectionHeader('Additional Notes');
  pdf.addParagraph(notes);
  pdf.addSpacing(SPACING.md);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatEncounterType(type: string): string {
  const types: Record<string, string> = {
    inpatient: 'Inpatient',
    observation: 'Observation',
    ed: 'Emergency Department',
    outpatient: 'Outpatient',
  };
  return types[type] || type;
}

function formatFacilityType(type?: string): string {
  if (!type) return 'Standard';
  const types: Record<string, string> = {
    public_hospital: 'Public Hospital',
    dsh_hospital: 'DSH Hospital',
    safety_net: 'Safety Net',
    critical_access: 'Critical Access',
    standard: 'Standard',
  };
  return types[type] || type;
}

function formatInsuranceStatus(status: string): string {
  const statuses: Record<string, string> = {
    uninsured: 'Uninsured',
    underinsured: 'Underinsured',
    medicaid: 'Medicaid',
    medicare: 'Medicare',
    commercial: 'Commercial',
  };
  return statuses[status] || status;
}

function formatMedicaidStatus(status: string): string {
  const statuses: Record<string, string> = {
    confirmed: 'Confirmed Eligible',
    likely: 'Likely Eligible',
    possible: 'Possibly Eligible',
    unlikely: 'Unlikely Eligible',
  };
  return statuses[status] || status;
}

function formatMedicareStatus(status: string): string {
  const statuses: Record<string, string> = {
    active_on_dos: 'Active on Date of Service',
    future_likely: 'Future Eligibility Likely',
    unlikely: 'Unlikely',
  };
  return statuses[status] || status;
}

function determineUrgency(result: Assessment['result']): string {
  const score = result.estimatedTotalRecovery * (result.overallConfidence / 100);

  if (score >= 10000 && result.overallConfidence >= 80) {
    return 'CRITICAL';
  }
  if (score >= 5000 && result.overallConfidence >= 60) {
    return 'HIGH';
  }
  if (score >= 1000 && result.overallConfidence >= 40) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export default generateDetailedAssessment;
