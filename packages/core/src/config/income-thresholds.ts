/**
 * Income Thresholds Configuration
 * Federal Poverty Level (FPL) thresholds and Medicaid expansion state lists
 */

// ============================================================================
// MEDICAID EXPANSION STATES
// ============================================================================

/**
 * States that have adopted Medicaid expansion under the ACA
 * Updated as of 2024 - 40 states + DC have adopted expansion
 */
export const MEDICAID_EXPANSION_STATES: string[] = [
  // Original expansion states (2014)
  'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'HI', 'IL', 'IA', 'KY', 'MD', 'MA',
  'MI', 'MN', 'NV', 'NJ', 'NM', 'NY', 'ND', 'OH', 'OR', 'RI', 'VT', 'WA', 'WV',
  // Later expansion states
  'AK', // 2015
  'MT', // 2016
  'LA', // 2016
  'IN', // 2015 via 1115 waiver
  'PA', // 2015
  'NH', // 2016
  'ME', // 2019
  'VA', // 2019
  'ID', // 2020
  'NE', // 2020
  'UT', // 2020
  'OK', // 2021
  'MO', // 2021
  'NC', // 2023
  'SD', // 2023
];

/**
 * Non-expansion states (as of 2024)
 */
export const NON_EXPANSION_STATES: string[] = [
  'AL', 'FL', 'GA', 'KS', 'MS', 'SC', 'TN', 'TX', 'WI', 'WY'
];

// ============================================================================
// FPL INCOME LEVELS
// ============================================================================

/**
 * Income level categories relative to Federal Poverty Level
 */
export type IncomeLevel =
  | 'under_fpl'
  | 'fpl_138'
  | 'fpl_200'
  | 'fpl_250'
  | 'fpl_300'
  | 'fpl_400'
  | 'over_400_fpl';

/**
 * Ordered list of income levels from lowest to highest
 */
export const INCOME_LEVEL_ORDER: IncomeLevel[] = [
  'under_fpl',
  'fpl_138',
  'fpl_200',
  'fpl_250',
  'fpl_300',
  'fpl_400',
  'over_400_fpl'
];

/**
 * 2024 Federal Poverty Level guidelines (annual income)
 * Source: HHS Poverty Guidelines
 */
export const FPL_2024_ANNUAL: Record<number, number> = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720,
  // For households > 8, add $5,380 per additional person
};

/**
 * Additional amount per person for households larger than 8
 */
export const FPL_2024_ADDITIONAL_PERSON = 5380;

/**
 * Get FPL threshold for a given household size
 */
export function getFPLThreshold(householdSize: number): number {
  if (householdSize <= 0) {
    return FPL_2024_ANNUAL[1] ?? 15060;
  }
  if (householdSize <= 8) {
    return FPL_2024_ANNUAL[householdSize] ?? FPL_2024_ANNUAL[1] ?? 15060;
  }
  // For households > 8, add additional amount per person
  const base = FPL_2024_ANNUAL[8] ?? 52720;
  return base + ((householdSize - 8) * FPL_2024_ADDITIONAL_PERSON);
}

/**
 * Get FPL percentage threshold
 */
export function getFPLPercentageThreshold(householdSize: number, percentage: number): number {
  return Math.round(getFPLThreshold(householdSize) * (percentage / 100));
}

/**
 * Check if a state is a Medicaid expansion state
 */
export function isMedicaidExpansionState(stateCode: string): boolean {
  return MEDICAID_EXPANSION_STATES.includes(stateCode.toUpperCase());
}

/**
 * Get the Medicaid income limit for a state (as FPL percentage)
 * Expansion states: 138% FPL
 * Non-expansion states: varies, generally much lower for adults
 */
export function getMedicaidIncomeLimit(stateCode: string): string {
  return isMedicaidExpansionState(stateCode) ? 'fpl_138' : 'fpl_100';
}

/**
 * Check if income is below a given FPL threshold
 * @param income - Income level category
 * @param threshold - FPL threshold to check against
 * @returns true if income is at or below the threshold
 */
export function isIncomeBelowThreshold(income: IncomeLevel, threshold: string): boolean {
  const incomeIndex = INCOME_LEVEL_ORDER.indexOf(income);
  const thresholdIndex = INCOME_LEVEL_ORDER.indexOf(threshold as IncomeLevel);

  if (incomeIndex === -1 || thresholdIndex === -1) {
    return false;
  }

  return incomeIndex <= thresholdIndex;
}

/**
 * Parse FPL percentage string to threshold key
 * @param fplString - String like "200% FPL" or "138% FPL"
 * @returns IncomeLevel threshold key
 */
export function parseFPLString(fplString: string): IncomeLevel {
  const match = fplString.match(/(\d+)/);
  if (!match?.[1]) return 'fpl_138';

  const percentage = parseInt(match[1], 10);

  if (percentage <= 100) return 'under_fpl';
  if (percentage <= 138) return 'fpl_138';
  if (percentage <= 200) return 'fpl_200';
  if (percentage <= 250) return 'fpl_250';
  if (percentage <= 300) return 'fpl_300';
  if (percentage <= 400) return 'fpl_400';
  return 'over_400_fpl';
}

// ============================================================================
// SSI/SSDI THRESHOLDS
// ============================================================================

/**
 * 2024 SSI Federal Benefit Rate (monthly)
 */
export const SSI_FBR_2024_MONTHLY = 943;

/**
 * 2024 SSI resource limit (individual)
 */
export const SSI_RESOURCE_LIMIT_INDIVIDUAL = 2000;

/**
 * 2024 SSI resource limit (couple)
 */
export const SSI_RESOURCE_LIMIT_COUPLE = 3000;

/**
 * 2024 Substantial Gainful Activity (SGA) limit (monthly, non-blind)
 */
export const SGA_LIMIT_2024_MONTHLY = 1550;

/**
 * 2024 SGA limit for blind individuals (monthly)
 */
export const SGA_LIMIT_BLIND_2024_MONTHLY = 2590;
