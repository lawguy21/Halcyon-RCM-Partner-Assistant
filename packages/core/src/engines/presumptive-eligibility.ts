/**
 * Presumptive Eligibility (PE) Engine
 *
 * Determines if a hospital can grant temporary Medicaid coverage through
 * Hospital Presumptive Eligibility (HPE) programs.
 *
 * PE allows qualified hospitals to grant temporary Medicaid coverage while
 * a full application is processed, ensuring immediate access to care.
 *
 * Key features:
 * - Uses simplified income test (gross income, not full MAGI)
 * - Checks state HPE program availability by patient category
 * - Calculates temporary coverage periods
 * - Generates required follow-up actions
 */

import { calculateFPLThreshold, MEDICAID_EXPANSION_STATES } from './magi-calculator.js';

// ============================================================================
// PATIENT CATEGORY TYPES
// ============================================================================

/**
 * Patient categories eligible for Presumptive Eligibility
 */
export type PEPatientCategory =
  | 'adult'
  | 'child'
  | 'pregnant'
  | 'formerFosterCare'
  | 'parentCaretaker';

// ============================================================================
// INPUT INTERFACE
// ============================================================================

/**
 * Input data for Presumptive Eligibility determination
 */
export interface PresumptiveEligibilityInput {
  /** Whether the hospital is a qualified HPE entity */
  isQualifiedHPEEntity: boolean;

  /** Patient's eligibility category */
  patientCategory: PEPatientCategory;

  /** Gross monthly household income (simplified test) */
  grossMonthlyIncome: number;

  /** Number of people in household */
  householdSize: number;

  /** Two-letter state code (e.g., 'CA', 'TX') */
  stateOfResidence: string;

  /** Date of PE application/determination */
  applicationDate: Date;
}

// ============================================================================
// OUTPUT INTERFACE
// ============================================================================

/**
 * Result of Presumptive Eligibility determination
 */
export interface PresumptiveEligibilityResult {
  /** Whether PE can be granted */
  canGrantPE: boolean;

  /** Start date of temporary coverage (if granted) */
  temporaryCoverageStart: Date;

  /** End date of temporary coverage (end of month following determination) */
  temporaryCoverageEnd: Date;

  /** Deadline to submit full Medicaid application */
  fullApplicationDeadline: Date;

  /** Required follow-up actions */
  requiredActions: string[];

  /** Confidence score (0-100) */
  confidence: number;

  /** Denial reason (if PE cannot be granted) */
  denialReason?: string;

  /** Additional notes about the determination */
  notes: string[];

  /** Income limit used for determination (annual) */
  incomeThresholdUsed: number;

  /** FPL percentage threshold for this category/state */
  fplPercentageThreshold: number;
}

// ============================================================================
// STATE HPE PROGRAM CONFIGURATION
// ============================================================================

/**
 * States with HPE programs for children (20 states)
 */
export const HPE_STATES_CHILDREN: string[] = [
  'AZ', 'CA', 'CO', 'CT', 'FL', 'IL', 'LA', 'MA', 'MI', 'MN',
  'NJ', 'NM', 'NY', 'NC', 'OH', 'OR', 'PA', 'TX', 'WA', 'WI',
];

/**
 * States with HPE programs for pregnant women (30 states)
 */
export const HPE_STATES_PREGNANT: string[] = [
  'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'IL', 'IN',
  'KS', 'KY', 'LA', 'MA', 'MI', 'MN', 'MS', 'MO', 'NJ', 'NM',
  'NY', 'NC', 'OH', 'OK', 'OR', 'PA', 'SC', 'TX', 'WA', 'WI',
];

/**
 * States with HPE programs for adults (Medicaid expansion states)
 */
export const HPE_STATES_ADULTS: string[] = MEDICAID_EXPANSION_STATES;

/**
 * States with HPE programs for former foster care youth
 */
export const HPE_STATES_FORMER_FOSTER_CARE: string[] = [
  'AZ', 'CA', 'CO', 'CT', 'IL', 'MA', 'MI', 'MN', 'NJ', 'NM',
  'NY', 'OH', 'OR', 'PA', 'WA',
];

/**
 * States with HPE programs for parent/caretaker relatives
 */
export const HPE_STATES_PARENT_CARETAKER: string[] = [
  'AZ', 'CA', 'CO', 'CT', 'IL', 'MA', 'MI', 'MN', 'NJ', 'NM',
  'NY', 'OH', 'OR', 'PA', 'WA', 'WI',
];

// ============================================================================
// FPL THRESHOLDS BY CATEGORY
// ============================================================================

/**
 * FPL percentage thresholds by patient category
 */
export const PE_FPL_THRESHOLDS: Record<PEPatientCategory, number> = {
  child: 200,
  pregnant: 200,
  adult: 138,
  formerFosterCare: 138,
  parentCaretaker: 138,
};

/**
 * Application deadline days by state
 */
export const STATE_APPLICATION_DEADLINES: Record<string, number> = {
  CA: 60,
  NY: 45,
  TX: 30,
  FL: 30,
};

const DEFAULT_APPLICATION_DEADLINE_DAYS = 45;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a state has HPE program for a specific patient category
 */
export function stateHasHPEProgram(
  stateCode: string,
  category: PEPatientCategory
): boolean {
  const normalizedState = stateCode.toUpperCase();

  switch (category) {
    case 'child':
      return HPE_STATES_CHILDREN.includes(normalizedState);
    case 'pregnant':
      return HPE_STATES_PREGNANT.includes(normalizedState);
    case 'adult':
      return HPE_STATES_ADULTS.includes(normalizedState);
    case 'formerFosterCare':
      return HPE_STATES_FORMER_FOSTER_CARE.includes(normalizedState);
    case 'parentCaretaker':
      return HPE_STATES_PARENT_CARETAKER.includes(normalizedState);
    default:
      return false;
  }
}

/**
 * Calculate the end of the month following a given date
 */
export function calculateCoverageEndDate(applicationDate: Date): Date {
  const endDate = new Date(applicationDate);
  endDate.setMonth(endDate.getMonth() + 2);
  endDate.setDate(1);
  endDate.setDate(0);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

/**
 * Calculate the full Medicaid application deadline
 */
export function calculateApplicationDeadline(
  applicationDate: Date,
  stateCode: string
): Date {
  const normalizedState = stateCode.toUpperCase();
  const deadlineDays =
    STATE_APPLICATION_DEADLINES[normalizedState] ??
    DEFAULT_APPLICATION_DEADLINE_DAYS;

  const deadline = new Date(applicationDate);
  deadline.setDate(deadline.getDate() + deadlineDays);
  return deadline;
}

/**
 * Get the annual income threshold for PE eligibility
 */
export function getPEIncomeThreshold(
  householdSize: number,
  category: PEPatientCategory
): number {
  const fplPercentage = PE_FPL_THRESHOLDS[category];
  const fplThreshold = calculateFPLThreshold(householdSize);
  return Math.round(fplThreshold * (fplPercentage / 100));
}

/**
 * Convert monthly income to annual for comparison
 */
function monthlyToAnnualIncome(monthlyIncome: number): number {
  return monthlyIncome * 12;
}

/**
 * Get display-friendly name for patient category
 */
function getCategoryDisplayName(category: PEPatientCategory): string {
  switch (category) {
    case 'adult':
      return 'adults';
    case 'child':
      return 'children';
    case 'pregnant':
      return 'pregnant women';
    case 'formerFosterCare':
      return 'former foster care youth';
    case 'parentCaretaker':
      return 'parent/caretaker relatives';
    default:
      return category;
  }
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Evaluate Presumptive Eligibility for a patient
 */
export function evaluatePresumptiveEligibility(
  input: PresumptiveEligibilityInput
): PresumptiveEligibilityResult {
  const {
    isQualifiedHPEEntity,
    patientCategory,
    grossMonthlyIncome,
    householdSize,
    stateOfResidence,
    applicationDate,
  } = input;

  const normalizedState = stateOfResidence.toUpperCase();
  const notes: string[] = [];
  const requiredActions: string[] = [];
  let confidence = 0;
  let denialReason: string | undefined;

  // Calculate income threshold
  const fplPercentage = PE_FPL_THRESHOLDS[patientCategory];
  const annualIncomeThreshold = getPEIncomeThreshold(householdSize, patientCategory);
  const patientAnnualIncome = monthlyToAnnualIncome(grossMonthlyIncome);

  // Calculate coverage dates
  const temporaryCoverageStart = new Date(applicationDate);
  const temporaryCoverageEnd = calculateCoverageEndDate(applicationDate);
  const fullApplicationDeadline = calculateApplicationDeadline(
    applicationDate,
    normalizedState
  );

  // Step 1: Verify hospital is a qualified HPE entity
  if (!isQualifiedHPEEntity) {
    denialReason = 'Hospital is not a qualified HPE entity';
    notes.push('Only qualified HPE entities can grant presumptive eligibility');
    notes.push('Hospital must apply to state Medicaid agency to become HPE-qualified');
    requiredActions.push('Verify hospital HPE qualification status with state Medicaid agency');
    requiredActions.push('If not qualified, assist patient with standard Medicaid application');

    return {
      canGrantPE: false,
      temporaryCoverageStart,
      temporaryCoverageEnd,
      fullApplicationDeadline,
      requiredActions,
      confidence: 95,
      denialReason,
      notes,
      incomeThresholdUsed: annualIncomeThreshold,
      fplPercentageThreshold: fplPercentage,
    };
  }

  confidence += 20;
  notes.push('Hospital is a qualified HPE entity');

  // Step 2: Check if state has HPE program for this category
  const stateHasProgram = stateHasHPEProgram(normalizedState, patientCategory);

  if (!stateHasProgram) {
    denialReason = `State ${normalizedState} does not have HPE program for ${patientCategory} category`;
    notes.push(`${normalizedState} has not implemented HPE for ${getCategoryDisplayName(patientCategory)}`);
    requiredActions.push('Assist patient with standard Medicaid application');
    requiredActions.push('Check for other expedited eligibility options in state');

    if (patientCategory === 'pregnant') {
      requiredActions.push('Verify pregnancy Medicaid options - most states have expedited processes');
    }

    return {
      canGrantPE: false,
      temporaryCoverageStart,
      temporaryCoverageEnd,
      fullApplicationDeadline,
      requiredActions,
      confidence: 90,
      denialReason,
      notes,
      incomeThresholdUsed: annualIncomeThreshold,
      fplPercentageThreshold: fplPercentage,
    };
  }

  confidence += 25;
  notes.push(`${normalizedState} has HPE program for ${getCategoryDisplayName(patientCategory)}`);

  // Step 3: Simplified income test (gross income only)
  const meetsIncomeRequirement = patientAnnualIncome <= annualIncomeThreshold;

  if (!meetsIncomeRequirement) {
    denialReason = 'Household income exceeds PE threshold';
    notes.push(
      `Annual income ($${patientAnnualIncome.toLocaleString()}) exceeds ` +
        `${fplPercentage}% FPL threshold ($${annualIncomeThreshold.toLocaleString()})`
    );
    notes.push('Income test uses gross income (simplified, not full MAGI)');
    requiredActions.push('Verify income documentation is accurate');
    requiredActions.push('Check for income disregards that may apply under full MAGI');
    requiredActions.push('Consider standard Medicaid application - full MAGI may differ');

    return {
      canGrantPE: false,
      temporaryCoverageStart,
      temporaryCoverageEnd,
      fullApplicationDeadline,
      requiredActions,
      confidence: 85,
      denialReason,
      notes,
      incomeThresholdUsed: annualIncomeThreshold,
      fplPercentageThreshold: fplPercentage,
    };
  }

  confidence += 35;
  notes.push(
    `Income ($${patientAnnualIncome.toLocaleString()}/year) is below ` +
      `${fplPercentage}% FPL ($${annualIncomeThreshold.toLocaleString()})`
  );
  notes.push('Simplified gross income test passed');

  // Step 4: PE can be granted - generate required actions
  confidence += 20;

  const coverageDays = Math.ceil(
    (temporaryCoverageEnd.getTime() - temporaryCoverageStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  notes.push(`Temporary coverage period: ${coverageDays} days`);
  notes.push(
    `Coverage ends: ${temporaryCoverageEnd.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`
  );

  const deadlineDays =
    STATE_APPLICATION_DEADLINES[normalizedState] ??
    DEFAULT_APPLICATION_DEADLINE_DAYS;

  requiredActions.push(
    `Submit full Medicaid application within ${deadlineDays} days (by ${fullApplicationDeadline.toLocaleDateString()})`
  );
  requiredActions.push('Collect required documentation for full application:');
  requiredActions.push('  - Proof of identity (birth certificate, ID)');
  requiredActions.push('  - Proof of income (pay stubs, tax returns)');
  requiredActions.push('  - Proof of residency (utility bills, lease)');
  requiredActions.push('  - Social Security numbers for household members');

  if (patientCategory === 'pregnant') {
    requiredActions.push('  - Pregnancy verification from healthcare provider');
    notes.push('Pregnant women coverage extends through 60 days postpartum');
  }

  if (patientCategory === 'formerFosterCare') {
    requiredActions.push('  - Documentation of former foster care status');
    requiredActions.push('  - State where foster care was received');
  }

  requiredActions.push('Notify patient of PE approval and coverage period');
  requiredActions.push('Document PE determination in patient record');
  requiredActions.push('Set reminder for application deadline follow-up');
  requiredActions.push('Bill Medicaid under PE coverage for eligible services');

  if (patientCategory === 'pregnant' || patientCategory === 'child') {
    confidence = Math.min(confidence + 5, 100);
    notes.push('Higher approval likelihood for this category under full application');
  }

  return {
    canGrantPE: true,
    temporaryCoverageStart,
    temporaryCoverageEnd,
    fullApplicationDeadline,
    requiredActions,
    confidence: Math.min(confidence, 100),
    notes,
    incomeThresholdUsed: annualIncomeThreshold,
    fplPercentageThreshold: fplPercentage,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get list of states with HPE programs by category
 */
export function getHPEStatesByCategory(): Record<PEPatientCategory, string[]> {
  return {
    adult: [...HPE_STATES_ADULTS],
    child: [...HPE_STATES_CHILDREN],
    pregnant: [...HPE_STATES_PREGNANT],
    formerFosterCare: [...HPE_STATES_FORMER_FOSTER_CARE],
    parentCaretaker: [...HPE_STATES_PARENT_CARETAKER],
  };
}

/**
 * Get count of states with HPE programs by category
 */
export function getHPEStateCounts(): Record<PEPatientCategory, number> {
  return {
    adult: HPE_STATES_ADULTS.length,
    child: HPE_STATES_CHILDREN.length,
    pregnant: HPE_STATES_PREGNANT.length,
    formerFosterCare: HPE_STATES_FORMER_FOSTER_CARE.length,
    parentCaretaker: HPE_STATES_PARENT_CARETAKER.length,
  };
}

/**
 * Validate PE input data
 */
export function validatePEInput(
  input: Partial<PresumptiveEligibilityInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof input.isQualifiedHPEEntity !== 'boolean') {
    errors.push('isQualifiedHPEEntity must be a boolean');
  }

  if (!input.patientCategory) {
    errors.push('patientCategory is required');
  } else if (
    !['adult', 'child', 'pregnant', 'formerFosterCare', 'parentCaretaker'].includes(
      input.patientCategory
    )
  ) {
    errors.push('patientCategory must be a valid category');
  }

  if (typeof input.grossMonthlyIncome !== 'number' || input.grossMonthlyIncome < 0) {
    errors.push('grossMonthlyIncome must be a non-negative number');
  }

  if (
    typeof input.householdSize !== 'number' ||
    input.householdSize < 1 ||
    !Number.isInteger(input.householdSize)
  ) {
    errors.push('householdSize must be a positive integer');
  }

  if (!input.stateOfResidence || input.stateOfResidence.length !== 2) {
    errors.push('stateOfResidence must be a 2-letter state code');
  }

  if (!(input.applicationDate instanceof Date) || isNaN(input.applicationDate.getTime())) {
    errors.push('applicationDate must be a valid Date');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
