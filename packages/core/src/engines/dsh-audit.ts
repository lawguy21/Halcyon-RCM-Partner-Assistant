/**
 * DSH Audit Compliance Engine
 *
 * Calculates DSH (Disproportionate Share Hospital) metrics and prepares
 * audit documentation for CMS compliance reviews.
 *
 * Key calculations:
 * - Disproportionate Patient Percentage (DPP)
 * - SSI Fraction and Medicaid Fraction
 * - Worksheet S-10 data preparation
 * - Hospital-specific DSH payment limit
 */

// ============================================================================
// INPUT INTERFACE
// ============================================================================

export type DSHFacilityType = 'urban' | 'rural' | 'sole_community' | 'critical_access';

export interface DSHAuditInput {
  /** Fiscal year for the audit period */
  fiscalYear: number;
  /** Total inpatient days for all patients */
  totalPatientDays: number;
  /** Medicare Part A inpatient days */
  medicarePartADays: number;
  /** Medicare patients also receiving SSI benefits */
  medicareSSIDays: number;
  /** Medicaid inpatient days (including dual eligible) */
  medicaidDays: number;
  /** Patients enrolled in both Medicare and Medicaid */
  dualEligibleDays: number;
  /** Total hospital operating costs for the fiscal year */
  totalOperatingCosts: number;
  /** Total Medicaid payments received */
  medicaidPayments: number;
  /** Total Medicare payments received */
  medicarePayments: number;
  /** Total uncompensated care costs at cost */
  uncompensatedCareCosts: number;
  /** Charity care provided at cost */
  charityCareAtCost: number;
  /** Bad debt expense at cost */
  badDebtAtCost: number;
  /** DSH payments received during the fiscal year */
  dshPaymentsReceived: number;
  /** Hospital facility type classification */
  facilityType: DSHFacilityType;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

export interface WorksheetS10Data {
  /** Line 1: Initial uncompensated care costs */
  line1: number;
  /** Line 2: Payments received for uncompensated care */
  line2: number;
  /** Line 3: Net uncompensated care costs (Line 1 - Line 2) */
  line3: number;
  /** Breakdown by category */
  byCategory: {
    charityCare: number;
    badDebt: number;
    nonMedicareUninsured: number;
    otherUncompensated: number;
  };
}

export interface DSHAuditResult {
  /** SSI Ratio: Medicare SSI Days / Total Medicare Part A Days */
  ssiRatio: number;
  /** Medicaid Ratio: (Medicaid Days - Dual Eligible Days) / Total Patient Days */
  medicaidRatio: number;
  /** Disproportionate Patient Percentage (SSI Ratio + Medicaid Ratio) */
  dpp: number;
  /** Whether hospital qualifies for DSH payments based on DPP */
  qualifiesForDSH: boolean;
  /** Prepared Worksheet S-10 data for audit documentation */
  worksheetS10: WorksheetS10Data;
  /** Maximum allowable DSH payment (cannot exceed uncompensated care costs) */
  hospitalSpecificLimit: number;
  /** Current DSH payments received */
  currentDSHPayments: number;
  /** Amount by which current payments exceed the hospital-specific limit */
  excessPaymentRisk: number;
  /** Score indicating readiness for DSH audit (0-100) */
  auditReadinessScore: number;
  /** List of documentation gaps that need to be addressed */
  documentationGaps: string[];
}

// ============================================================================
// DSH QUALIFICATION THRESHOLDS
// ============================================================================

interface DSHThreshold {
  minimumDPP: number;
  description: string;
}

const DSH_THRESHOLDS: Record<DSHFacilityType, DSHThreshold> = {
  urban: { minimumDPP: 0.15, description: 'Large urban hospital - DPP must exceed 15%' },
  rural: { minimumDPP: 0.15, description: 'Rural hospital - DPP must exceed 15%' },
  sole_community: { minimumDPP: 0.15, description: 'Sole community hospital - DPP must exceed 15%' },
  critical_access: { minimumDPP: 0.15, description: 'Critical access hospital - CAH DSH rules apply' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely divide two numbers, returning 0 if denominator is 0
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Round to specified decimal places
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate SSI Fraction
 */
function calculateSSIFraction(medicareSSIDays: number, medicarePartADays: number): number {
  return safeDivide(medicareSSIDays, medicarePartADays);
}

/**
 * Calculate Medicaid Fraction (excludes dual eligible to avoid double counting)
 */
function calculateMedicaidFraction(
  medicaidDays: number,
  dualEligibleDays: number,
  totalPatientDays: number
): number {
  const netMedicaidDays = Math.max(0, medicaidDays - dualEligibleDays);
  return safeDivide(netMedicaidDays, totalPatientDays);
}

/**
 * Determine if hospital qualifies for DSH based on DPP and facility type
 */
function determineDSHQualification(dpp: number, facilityType: DSHFacilityType): boolean {
  const threshold = DSH_THRESHOLDS[facilityType];
  return dpp > threshold.minimumDPP;
}

/**
 * Prepare Worksheet S-10 data
 */
function prepareWorksheetS10(input: DSHAuditInput): WorksheetS10Data {
  const line1 = input.uncompensatedCareCosts;
  const line2 = 0; // Would come from payment reconciliation
  const line3 = line1 - line2;

  const totalCategorized = input.charityCareAtCost + input.badDebtAtCost;
  const otherUncompensated = Math.max(0, input.uncompensatedCareCosts - totalCategorized);

  return {
    line1: roundTo(line1, 2),
    line2: roundTo(line2, 2),
    line3: roundTo(line3, 2),
    byCategory: {
      charityCare: roundTo(input.charityCareAtCost, 2),
      badDebt: roundTo(input.badDebtAtCost, 2),
      nonMedicareUninsured: roundTo(otherUncompensated * 0.6, 2),
      otherUncompensated: roundTo(otherUncompensated * 0.4, 2)
    }
  };
}

/**
 * Calculate hospital-specific DSH payment limit
 */
function calculateHospitalSpecificLimit(input: DSHAuditInput): number {
  return input.uncompensatedCareCosts;
}

/**
 * Identify documentation gaps for audit readiness
 */
function identifyDocumentationGaps(input: DSHAuditInput): string[] {
  const gaps: string[] = [];

  if (input.totalPatientDays === 0) {
    gaps.push('Total patient days is zero - verify inpatient census data');
  }

  if (input.medicarePartADays === 0) {
    gaps.push('Medicare Part A days is zero - verify Medicare enrollment verification');
  }

  if (input.medicaidDays === 0 && input.dualEligibleDays > 0) {
    gaps.push('Medicaid days is zero but dual eligible days exist - data inconsistency');
  }

  if (input.dualEligibleDays > input.medicaidDays) {
    gaps.push('Dual eligible days exceed Medicaid days - verify eligibility classification');
  }

  if (input.dualEligibleDays > input.medicarePartADays) {
    gaps.push('Dual eligible days exceed Medicare Part A days - verify eligibility classification');
  }

  if (input.medicareSSIDays > input.medicarePartADays) {
    gaps.push('Medicare SSI days exceed Medicare Part A days - verify SSI matching');
  }

  if (input.uncompensatedCareCosts === 0) {
    gaps.push('Uncompensated care costs is zero - verify charity care and bad debt reporting');
  }

  if (input.charityCareAtCost === 0 && input.badDebtAtCost === 0) {
    gaps.push('No charity care or bad debt recorded - may require financial assistance policy review');
  }

  if (input.uncompensatedCareCosts < input.charityCareAtCost + input.badDebtAtCost) {
    gaps.push('Uncompensated care total less than sum of components - reconciliation needed');
  }

  if (input.totalOperatingCosts === 0) {
    gaps.push('Total operating costs is zero - verify cost report completion');
  }

  if (input.dshPaymentsReceived > 0 && input.uncompensatedCareCosts === 0) {
    gaps.push('DSH payments received but no uncompensated care reported - high audit risk');
  }

  const currentYear = new Date().getFullYear();
  if (input.fiscalYear < currentYear - 5 || input.fiscalYear > currentYear + 1) {
    gaps.push(`Fiscal year ${input.fiscalYear} may be outside typical audit period`);
  }

  return gaps;
}

/**
 * Calculate audit readiness score
 */
function calculateAuditReadinessScore(input: DSHAuditInput, gaps: string[]): number {
  let score = 100;

  score -= gaps.length * 10;

  if (input.totalPatientDays === 0) score -= 20;
  if (input.medicarePartADays === 0) score -= 15;
  if (input.uncompensatedCareCosts === 0 && input.dshPaymentsReceived > 0) score -= 25;

  const ssiRatio = calculateSSIFraction(input.medicareSSIDays, input.medicarePartADays);
  const medicaidRatio = calculateMedicaidFraction(
    input.medicaidDays,
    input.dualEligibleDays,
    input.totalPatientDays
  );

  if (ssiRatio > 0.5) score -= 5;
  if (medicaidRatio > 0.8) score -= 5;

  if (input.totalOperatingCosts > 0 && input.medicaidPayments > 0 && input.medicarePayments > 0) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Calculate DSH metrics and prepare audit documentation
 */
export function calculateDSHAudit(input: DSHAuditInput): DSHAuditResult {
  const ssiRatio = calculateSSIFraction(input.medicareSSIDays, input.medicarePartADays);
  const medicaidRatio = calculateMedicaidFraction(
    input.medicaidDays,
    input.dualEligibleDays,
    input.totalPatientDays
  );
  const dpp = ssiRatio + medicaidRatio;

  const qualifiesForDSH = determineDSHQualification(dpp, input.facilityType);
  const worksheetS10 = prepareWorksheetS10(input);
  const hospitalSpecificLimit = calculateHospitalSpecificLimit(input);
  const excessPaymentRisk = Math.max(0, input.dshPaymentsReceived - hospitalSpecificLimit);
  const documentationGaps = identifyDocumentationGaps(input);
  const auditReadinessScore = calculateAuditReadinessScore(input, documentationGaps);

  return {
    ssiRatio: roundTo(ssiRatio, 6),
    medicaidRatio: roundTo(medicaidRatio, 6),
    dpp: roundTo(dpp, 6),
    qualifiesForDSH,
    worksheetS10,
    hospitalSpecificLimit: roundTo(hospitalSpecificLimit, 2),
    currentDSHPayments: roundTo(input.dshPaymentsReceived, 2),
    excessPaymentRisk: roundTo(excessPaymentRisk, 2),
    auditReadinessScore,
    documentationGaps
  };
}
