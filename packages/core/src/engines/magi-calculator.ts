/**
 * MAGI (Modified Adjusted Gross Income) Calculator Engine
 *
 * Calculates Modified Adjusted Gross Income for Medicaid eligibility determination
 * using ACA methodology with 5% income disregard.
 *
 * Key components:
 * - MAGI calculation (excludes certain income types)
 * - FPL percentage calculation based on household size
 * - State threshold comparison (expansion vs non-expansion)
 * - Eligibility determination with confidence scoring
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Income sources that are EXCLUDED from MAGI calculation
 * These are non-taxable income sources that don't count toward Medicaid eligibility
 */
export type ExcludedIncomeType =
  | 'child_support_received'
  | 'ssi_benefits'
  | 'workers_compensation'
  | 'veterans_benefits';

/**
 * Income breakdown for MAGI calculation
 */
export interface MAGIIncomeInput {
  /** Gross income from all sources (wages, salaries, tips, self-employment, etc.) */
  grossIncome: number;

  /** Child support received (EXCLUDED from MAGI) */
  childSupportReceived?: number;

  /** Supplemental Security Income benefits (EXCLUDED from MAGI) */
  ssiBenefits?: number;

  /** Workers' compensation payments (EXCLUDED from MAGI) */
  workersCompensation?: number;

  /** Veterans benefits (EXCLUDED from MAGI) */
  veteransBenefits?: number;

  /** Other tax-exempt income to exclude */
  otherExcludedIncome?: number;
}

/**
 * Household information for FPL calculation
 */
export interface MAGIHouseholdInput {
  /** Number of people in the tax household */
  householdSize: number;

  /** State of residence (2-letter code) */
  stateCode: string;

  /** Applicant category for threshold determination */
  applicantCategory?: MAGIApplicantCategory;
}

/**
 * Applicant categories for non-expansion states
 * Different categories have different income thresholds
 */
export type MAGIApplicantCategory =
  | 'adult'                    // Adults 19-64 without dependent children
  | 'parent_caretaker'         // Parents/caretaker relatives of dependent children
  | 'pregnant_woman'           // Pregnant women
  | 'child'                    // Children under 19
  | 'former_foster_youth';     // Former foster care youth under 26

/**
 * Complete input for MAGI calculation
 */
export interface MAGICalculatorInput {
  income: MAGIIncomeInput;
  household: MAGIHouseholdInput;
}

/**
 * MAGI calculation result
 */
export interface MAGIResult {
  /** Calculated Modified Adjusted Gross Income */
  magi: number;

  /** MAGI as a percentage of Federal Poverty Level */
  fplPercentage: number;

  /** Applicable state income threshold (as FPL percentage) */
  stateThreshold: number;

  /** Whether income is below state threshold (eligible) */
  isIncomeEligible: boolean;

  /** Difference between MAGI FPL% and state threshold (negative = below threshold) */
  marginToThreshold: number;

  /** Confidence score for the eligibility determination (0-100) */
  confidence: number;

  /** Detailed breakdown of the calculation */
  breakdown: MAGIBreakdown;

  /** Notes about the calculation */
  notes: string[];
}

/**
 * Detailed breakdown of MAGI calculation
 */
export interface MAGIBreakdown {
  /** Original gross income */
  grossIncome: number;

  /** Total excluded income */
  totalExcludedIncome: number;

  /** Individual excluded income items */
  excludedItems: ExcludedIncomeItem[];

  /** FPL threshold for household size */
  fplThreshold: number;

  /** 5% income disregard amount */
  incomeDisregard: number;

  /** Effective threshold after 5% disregard (138% = 133% + 5%) */
  effectiveThreshold: number;

  /** Whether state is Medicaid expansion state */
  isExpansionState: boolean;
}

/**
 * Individual excluded income item
 */
export interface ExcludedIncomeItem {
  type: ExcludedIncomeType | 'other';
  amount: number;
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * 2024 FPL base values
 */
export const FPL_2024: Record<number, number> = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720,
};

export const FPL_2024_PER_ADDITIONAL = 5380;

/**
 * Medicaid expansion threshold (138% FPL)
 * This is calculated as 133% + 5% income disregard
 */
export const EXPANSION_THRESHOLD_PERCENT = 138;

/**
 * Base Medicaid threshold before income disregard (133% FPL)
 */
export const BASE_THRESHOLD_PERCENT = 133;

/**
 * Income disregard percentage (5%)
 * Applied to effectively raise the threshold from 133% to 138%
 */
export const INCOME_DISREGARD_PERCENT = 5;

/**
 * Medicaid expansion states (40 states + DC as of 2024)
 */
export const MEDICAID_EXPANSION_STATES: string[] = [
  'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'RI', 'SD', 'UT', 'VT', 'VA', 'WA', 'WV'
];

/**
 * Non-expansion state thresholds by category (as FPL percentage)
 * These vary significantly by state and category
 */
export const NON_EXPANSION_THRESHOLDS: Record<string, Record<MAGIApplicantCategory, number>> = {
  AL: { adult: 0, parent_caretaker: 18, pregnant_woman: 146, child: 146, former_foster_youth: 138 },
  FL: { adult: 0, parent_caretaker: 26, pregnant_woman: 191, child: 210, former_foster_youth: 138 },
  GA: { adult: 0, parent_caretaker: 35, pregnant_woman: 220, child: 247, former_foster_youth: 138 },
  KS: { adult: 0, parent_caretaker: 38, pregnant_woman: 166, child: 166, former_foster_youth: 138 },
  MS: { adult: 0, parent_caretaker: 27, pregnant_woman: 194, child: 209, former_foster_youth: 138 },
  SC: { adult: 0, parent_caretaker: 67, pregnant_woman: 199, child: 213, former_foster_youth: 138 },
  TN: { adult: 0, parent_caretaker: 98, pregnant_woman: 195, child: 211, former_foster_youth: 138 },
  TX: { adult: 0, parent_caretaker: 14, pregnant_woman: 198, child: 201, former_foster_youth: 138 },
  WI: { adult: 100, parent_caretaker: 100, pregnant_woman: 301, child: 306, former_foster_youth: 138 },
  WY: { adult: 0, parent_caretaker: 54, pregnant_woman: 154, child: 154, former_foster_youth: 138 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate FPL threshold for a given household size
 * Uses 2024 FPL values
 */
export function calculateFPLThreshold(householdSize: number): number {
  const defaultFPL = 15060; // FPL for household size of 1

  if (householdSize <= 0) {
    return FPL_2024[1] ?? defaultFPL;
  }

  if (householdSize <= 8) {
    return FPL_2024[householdSize] ?? FPL_2024[1] ?? defaultFPL;
  }

  // For households > 8, add additional amount per person
  const base8 = FPL_2024[8] ?? 52720;
  return base8 + ((householdSize - 8) * FPL_2024_PER_ADDITIONAL);
}

/**
 * Check if a state is a Medicaid expansion state
 */
export function isExpansionState(stateCode: string): boolean {
  return MEDICAID_EXPANSION_STATES.includes(stateCode.toUpperCase());
}

/**
 * Get the applicable Medicaid income threshold for a state
 */
export function getStateThreshold(
  stateCode: string,
  category: MAGIApplicantCategory = 'adult'
): number {
  const upperState = stateCode.toUpperCase();

  if (isExpansionState(upperState)) {
    return EXPANSION_THRESHOLD_PERCENT;
  }

  // Non-expansion state - look up by category
  const stateThresholds = NON_EXPANSION_THRESHOLDS[upperState];
  if (stateThresholds) {
    return stateThresholds[category] ?? 0;
  }

  // Unknown state - return 0 (no coverage for adults)
  return 0;
}

/**
 * Calculate the 5% income disregard amount
 * This effectively raises the threshold from 133% to 138%
 */
export function calculateIncomeDisregard(fplThreshold: number): number {
  return Math.round(fplThreshold * (INCOME_DISREGARD_PERCENT / 100));
}

// ============================================================================
// MAIN CALCULATOR FUNCTION
// ============================================================================

/**
 * Calculate Modified Adjusted Gross Income (MAGI) and determine Medicaid eligibility
 *
 * MAGI is calculated by starting with gross income and excluding:
 * - Child support received
 * - SSI benefits
 * - Workers' compensation
 * - Veterans benefits
 * - Other tax-exempt income
 *
 * The 5% income disregard is applied to effectively raise the eligibility
 * threshold from 133% to 138% FPL in expansion states.
 */
export function calculateMAGI(input: MAGICalculatorInput): MAGIResult {
  const { income, household } = input;
  const notes: string[] = [];

  // Validate inputs
  let householdSize = household.householdSize;
  if (householdSize <= 0) {
    householdSize = 1;
    notes.push('Household size adjusted to minimum of 1');
  }

  // ========================================
  // Step 1: Calculate MAGI (exclude non-taxable income)
  // ========================================

  const excludedItems: ExcludedIncomeItem[] = [];
  let totalExcludedIncome = 0;

  // Child support received
  if (income.childSupportReceived && income.childSupportReceived > 0) {
    excludedItems.push({
      type: 'child_support_received',
      amount: income.childSupportReceived,
      description: 'Child support payments received',
    });
    totalExcludedIncome += income.childSupportReceived;
  }

  // SSI benefits
  if (income.ssiBenefits && income.ssiBenefits > 0) {
    excludedItems.push({
      type: 'ssi_benefits',
      amount: income.ssiBenefits,
      description: 'Supplemental Security Income (SSI) benefits',
    });
    totalExcludedIncome += income.ssiBenefits;
  }

  // Workers' compensation
  if (income.workersCompensation && income.workersCompensation > 0) {
    excludedItems.push({
      type: 'workers_compensation',
      amount: income.workersCompensation,
      description: "Workers' compensation payments",
    });
    totalExcludedIncome += income.workersCompensation;
  }

  // Veterans benefits
  if (income.veteransBenefits && income.veteransBenefits > 0) {
    excludedItems.push({
      type: 'veterans_benefits',
      amount: income.veteransBenefits,
      description: 'Veterans benefits (VA pension, disability)',
    });
    totalExcludedIncome += income.veteransBenefits;
  }

  // Other excluded income
  if (income.otherExcludedIncome && income.otherExcludedIncome > 0) {
    excludedItems.push({
      type: 'other',
      amount: income.otherExcludedIncome,
      description: 'Other tax-exempt income',
    });
    totalExcludedIncome += income.otherExcludedIncome;
  }

  // Calculate MAGI = Gross Income - Excluded Income
  const magi = Math.max(0, income.grossIncome - totalExcludedIncome);

  // ========================================
  // Step 2: Calculate FPL percentage
  // ========================================

  const fplThreshold = calculateFPLThreshold(householdSize);
  const fplPercentage = fplThreshold > 0
    ? Math.round((magi / fplThreshold) * 100 * 100) / 100  // Round to 2 decimal places
    : 0;

  // ========================================
  // Step 3: Determine state threshold
  // ========================================

  const expansionState = isExpansionState(household.stateCode);
  const applicantCategory = household.applicantCategory ?? 'adult';
  const stateThreshold = getStateThreshold(household.stateCode, applicantCategory);

  // Calculate income disregard (5% of FPL)
  const incomeDisregard = calculateIncomeDisregard(fplThreshold);

  // Effective threshold includes the 5% disregard
  // For expansion states: 133% + 5% = 138%
  const effectiveThreshold = expansionState
    ? EXPANSION_THRESHOLD_PERCENT
    : stateThreshold;

  // ========================================
  // Step 4: Determine eligibility
  // ========================================

  const isIncomeEligible = fplPercentage <= effectiveThreshold && effectiveThreshold > 0;
  const marginToThreshold = Math.round((fplPercentage - effectiveThreshold) * 100) / 100;

  // ========================================
  // Step 5: Calculate confidence
  // ========================================

  let confidence = 90; // Start with high confidence

  // Reduce confidence for edge cases
  if (Math.abs(marginToThreshold) <= 5) {
    // Within 5% of threshold - moderate confidence
    confidence = 70;
    notes.push('Income is close to threshold - verify all income sources');
  }

  if (!expansionState && applicantCategory === 'adult' && stateThreshold === 0) {
    // Non-expansion state with no adult coverage
    confidence = 95;
    notes.push('State has not expanded Medicaid - adults without dependents generally not eligible');
  }

  if (expansionState) {
    notes.push(household.stateCode + ' is a Medicaid expansion state (138% FPL threshold)');
  } else {
    notes.push(household.stateCode + ' has not expanded Medicaid - threshold varies by category');
  }

  // Income disregard note
  if (fplPercentage > BASE_THRESHOLD_PERCENT && fplPercentage <= EXPANSION_THRESHOLD_PERCENT) {
    notes.push('Income is between 133-138% FPL - eligible due to 5% income disregard');
  }

  // Add note about excluded income if any
  if (totalExcludedIncome > 0) {
    notes.push('$' + totalExcludedIncome.toLocaleString() + ' in non-taxable income excluded from MAGI');
  }

  // ========================================
  // Build result
  // ========================================

  const breakdown: MAGIBreakdown = {
    grossIncome: income.grossIncome,
    totalExcludedIncome,
    excludedItems,
    fplThreshold,
    incomeDisregard,
    effectiveThreshold,
    isExpansionState: expansionState,
  };

  return {
    magi,
    fplPercentage,
    stateThreshold: effectiveThreshold,
    isIncomeEligible,
    marginToThreshold,
    confidence,
    breakdown,
    notes,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick eligibility check without full breakdown
 */
export function quickMAGICheck(
  grossIncome: number,
  householdSize: number,
  stateCode: string
): { eligible: boolean; fplPercentage: number; threshold: number } {
  const result = calculateMAGI({
    income: { grossIncome },
    household: { householdSize, stateCode },
  });

  return {
    eligible: result.isIncomeEligible,
    fplPercentage: result.fplPercentage,
    threshold: result.stateThreshold,
  };
}

/**
 * Calculate monthly income limit for a household size and state
 */
export function getMonthlyIncomeLimit(
  householdSize: number,
  stateCode: string,
  category: MAGIApplicantCategory = 'adult'
): number {
  const fplThreshold = calculateFPLThreshold(householdSize);
  const thresholdPercent = getStateThreshold(stateCode, category);

  if (thresholdPercent === 0) {
    return 0;
  }

  const annualLimit = Math.round(fplThreshold * (thresholdPercent / 100));
  return Math.round(annualLimit / 12);
}

/**
 * Get all 2024 FPL thresholds by household size
 */
export function getFPL2024Thresholds(): Record<number, number> {
  const thresholds: Record<number, number> = {};

  // Standard sizes 1-8
  for (let size = 1; size <= 8; size++) {
    thresholds[size] = calculateFPLThreshold(size);
  }

  return thresholds;
}
