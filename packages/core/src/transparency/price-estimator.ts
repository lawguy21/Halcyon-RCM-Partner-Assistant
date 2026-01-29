/**
 * Price Estimation Engine
 *
 * CMS Price Transparency compliant price estimation engine.
 * Calculates patient cost estimates for healthcare services including:
 * - Single service estimates
 * - Bundled/package pricing
 * - Episode of care estimates
 * - Payer-specific rate comparisons
 *
 * Complies with:
 * - CMS Hospital Price Transparency Rule (45 CFR 180)
 * - No Surprises Act Good Faith Estimate requirements
 */

import {
  lookupFee,
  getMedicareAllowedAmount,
  calculateExpectedPayment,
  type ClaimCharge,
} from '../payers/fee-schedule.js';

// ============================================================================
// TYPES
// ============================================================================

/** Service line item for price estimation */
export interface ServiceItem {
  /** CPT/HCPCS code */
  cptCode: string;
  /** Service description */
  description?: string;
  /** Modifiers */
  modifiers?: string[];
  /** Number of units */
  units: number;
  /** Place of service code */
  placeOfService?: string;
  /** Date of service */
  dateOfService?: Date;
  /** ICD-10 diagnosis codes */
  diagnosisCodes?: string[];
  /** Revenue code (for facility charges) */
  revenueCode?: string;
  /** Gross charge amount (if known) */
  grossCharge?: number;
}

/** Patient information for estimating responsibility */
export interface PatientInfo {
  /** Patient ID */
  patientId?: string;
  /** Date of birth */
  dateOfBirth?: Date;
  /** Member ID */
  memberId?: string;
  /** Group number */
  groupNumber?: string;
  /** Whether patient has met their deductible */
  deductibleMet?: boolean;
  /** Accumulated deductible amount */
  accumulatedDeductible?: number;
  /** Whether patient has met their out-of-pocket max */
  outOfPocketMaxMet?: boolean;
  /** Accumulated out-of-pocket amount */
  accumulatedOutOfPocket?: number;
}

/** Insurance benefits information */
export interface BenefitsInfo {
  /** Plan name */
  planName?: string;
  /** Annual deductible amount */
  deductible: number;
  /** Annual out-of-pocket maximum */
  outOfPocketMax: number;
  /** Coinsurance percentage (e.g., 0.20 for 20%) */
  coinsurance: number;
  /** Copay amount for this service type */
  copay?: number;
  /** Whether service is covered */
  isCovered?: boolean;
  /** Benefit limitations */
  limitations?: string[];
  /** In-network indicator */
  isInNetwork?: boolean;
}

/** Accumulators for tracking patient spending */
export interface Accumulators {
  /** Amount already paid toward deductible */
  deductiblePaid: number;
  /** Amount already paid toward out-of-pocket max */
  outOfPocketPaid: number;
  /** Remaining deductible */
  deductibleRemaining: number;
  /** Remaining out-of-pocket */
  outOfPocketRemaining: number;
}

/** Service line breakdown in estimate */
export interface ServiceBreakdown {
  /** CPT code */
  cptCode: string;
  /** Service description */
  description: string;
  /** Units */
  units: number;
  /** Gross charge */
  grossCharge: number;
  /** Allowed amount per unit */
  allowedAmount: number;
  /** Contractual adjustment */
  contractualAdjustment: number;
  /** Expected payment after adjustment */
  expectedPayment: number;
  /** Patient responsibility for this line */
  patientResponsibility: number;
  /** Notes about this calculation */
  notes?: string;
}

/** Complete price estimate result */
export interface EstimateResult {
  /** Estimate unique ID */
  estimateId?: string;
  /** Timestamp of estimate */
  createdAt: Date;
  /** Total gross charges (chargemaster prices) */
  grossCharges: number;
  /** Total contractual adjustments */
  contractualAdjustment: number;
  /** Expected allowed amount (after adjustments) */
  expectedAllowed: number;
  /** Patient responsibility breakdown */
  patientResponsibility: {
    /** Amount applied to deductible */
    deductible: number;
    /** Copay amount */
    copay: number;
    /** Coinsurance amount */
    coinsurance: number;
    /** Total patient responsibility */
    total: number;
  };
  /** Insurance payment (expected allowed minus patient responsibility) */
  insurancePayment: number;
  /** Line-by-line breakdown */
  breakdown: ServiceBreakdown[];
  /** Estimate type */
  estimateType: 'single' | 'bundled' | 'episode';
  /** Payer information used */
  payerInfo?: {
    payerId: string;
    payerName?: string;
    planName?: string;
    isInNetwork: boolean;
  };
  /** Disclaimer text for patient communication */
  disclaimer: string;
  /** Validity period of estimate */
  validUntil: Date;
  /** Confidence level of estimate (0-100) */
  confidenceLevel: number;
  /** Notes and warnings */
  notes: string[];
}

/** Payer comparison result */
export interface PayerComparison {
  /** Payer ID */
  payerId: string;
  /** Payer name */
  payerName: string;
  /** Expected allowed amount */
  expectedAllowed: number;
  /** Estimated patient responsibility */
  patientResponsibility: number;
  /** Percent of Medicare rate */
  percentOfMedicare: number;
  /** Comparison ranking (1 = best value) */
  ranking: number;
}

/** Episode of care definition */
export interface EpisodeOfCare {
  /** Episode type (e.g., 'knee_replacement', 'colonoscopy') */
  episodeType: string;
  /** Episode name */
  name: string;
  /** Services included in the episode */
  services: ServiceItem[];
  /** Typical duration in days */
  durationDays: number;
  /** Phase of care */
  phases?: {
    name: string;
    services: ServiceItem[];
    durationDays: number;
  }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard estimate disclaimer per CMS requirements */
const STANDARD_DISCLAIMER = `This is an estimate of your expected costs and is not a guarantee of the final amount you will be charged. Your actual costs may vary based on the services you receive, your specific health plan benefits, and other factors. Please contact your insurance company to verify your benefits and coverage.`;

/** Estimate validity period in days */
const ESTIMATE_VALIDITY_DAYS = 30;

/** Default gross charge markup (percent of Medicare) */
const DEFAULT_GROSS_CHARGE_MARKUP = 3.5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique estimate ID
 */
function generateEstimateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `EST-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get gross charge for a service
 */
function getGrossCharge(service: ServiceItem): number {
  if (service.grossCharge !== undefined) {
    return service.grossCharge;
  }

  // Estimate gross charge based on Medicare rate with markup
  const medicareRate = getMedicareAllowedAmount(service.cptCode);
  if (medicareRate) {
    return medicareRate * DEFAULT_GROSS_CHARGE_MARKUP * service.units;
  }

  // Default fallback
  return 0;
}

/**
 * Calculate validity end date
 */
function calculateValidUntil(): Date {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + ESTIMATE_VALIDITY_DAYS);
  return validUntil;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calculate price estimate for services
 *
 * @param services - Array of services to estimate
 * @param payerId - Optional payer ID for contract-specific rates
 * @param patientInfo - Optional patient information
 * @returns Price estimate result
 */
export function estimatePrice(
  services: ServiceItem[],
  payerId?: string,
  patientInfo?: PatientInfo
): EstimateResult {
  const now = new Date();
  const breakdown: ServiceBreakdown[] = [];
  const notes: string[] = [];
  let totalGrossCharges = 0;
  let totalExpectedAllowed = 0;
  let confidenceLevel = 100;

  // Process each service
  for (const service of services) {
    const grossCharge = getGrossCharge(service);
    totalGrossCharges += grossCharge;

    let allowedAmount = 0;
    let lineNotes: string | undefined;

    // Get allowed amount based on payer or Medicare
    if (payerId) {
      const feeEntry = lookupFee(
        payerId,
        service.cptCode,
        service.dateOfService || now,
        { modifier: service.modifiers?.[0] }
      );

      if (feeEntry) {
        allowedAmount = feeEntry.allowedAmount;
      } else {
        // Fall back to Medicare rate
        const medicareRate = getMedicareAllowedAmount(service.cptCode);
        if (medicareRate) {
          allowedAmount = medicareRate;
          lineNotes = 'Using Medicare rate as estimate; actual contracted rate may differ';
          confidenceLevel = Math.min(confidenceLevel, 75);
        } else {
          // Estimate as percentage of gross
          allowedAmount = grossCharge * 0.40;
          lineNotes = 'Fee not in contract; estimated at 40% of gross charges';
          confidenceLevel = Math.min(confidenceLevel, 50);
        }
      }
    } else {
      // No payer specified - use Medicare rate
      const medicareRate = getMedicareAllowedAmount(service.cptCode);
      if (medicareRate) {
        allowedAmount = medicareRate;
        notes.push(`No payer specified; using Medicare rates as benchmark`);
        confidenceLevel = Math.min(confidenceLevel, 70);
      } else {
        allowedAmount = grossCharge * 0.40;
        confidenceLevel = Math.min(confidenceLevel, 40);
      }
    }

    const expectedPayment = allowedAmount * service.units;
    totalExpectedAllowed += expectedPayment;
    const contractualAdjustment = grossCharge - expectedPayment;

    breakdown.push({
      cptCode: service.cptCode,
      description: service.description || '',
      units: service.units,
      grossCharge,
      allowedAmount,
      contractualAdjustment,
      expectedPayment,
      patientResponsibility: 0, // Will be calculated when benefits applied
      notes: lineNotes,
    });
  }

  const contractualAdjustment = totalGrossCharges - totalExpectedAllowed;

  // Determine estimate type
  let estimateType: 'single' | 'bundled' | 'episode' = 'single';
  if (services.length > 1) {
    estimateType = 'bundled';
  }

  return {
    estimateId: generateEstimateId(),
    createdAt: now,
    grossCharges: Math.round(totalGrossCharges * 100) / 100,
    contractualAdjustment: Math.round(contractualAdjustment * 100) / 100,
    expectedAllowed: Math.round(totalExpectedAllowed * 100) / 100,
    patientResponsibility: {
      deductible: 0,
      copay: 0,
      coinsurance: 0,
      total: Math.round(totalExpectedAllowed * 100) / 100, // Without benefits, patient pays all
    },
    insurancePayment: 0,
    breakdown,
    estimateType,
    payerInfo: payerId
      ? { payerId, isInNetwork: true }
      : undefined,
    disclaimer: STANDARD_DISCLAIMER,
    validUntil: calculateValidUntil(),
    confidenceLevel,
    notes,
  };
}

/**
 * Apply insurance benefits to an estimate
 *
 * @param estimate - Base estimate
 * @param benefits - Insurance benefits information
 * @returns Updated estimate with patient responsibility calculated
 */
export function applyBenefits(
  estimate: EstimateResult,
  benefits: BenefitsInfo
): EstimateResult {
  // Clone the estimate
  const updatedEstimate: EstimateResult = JSON.parse(JSON.stringify(estimate));
  const notes: string[] = [...updatedEstimate.notes];

  // Check if service is covered
  if (benefits.isCovered === false) {
    updatedEstimate.patientResponsibility = {
      deductible: 0,
      copay: 0,
      coinsurance: 0,
      total: updatedEstimate.grossCharges,
    };
    updatedEstimate.insurancePayment = 0;
    notes.push('Service not covered by insurance; patient responsible for full charges');
    updatedEstimate.notes = notes;
    return updatedEstimate;
  }

  // Calculate patient responsibility
  let remainingAllowed = updatedEstimate.expectedAllowed;
  let deductibleAmount = 0;
  let copayAmount = 0;
  let coinsuranceAmount = 0;

  // Apply copay first (if applicable)
  if (benefits.copay) {
    copayAmount = Math.min(benefits.copay, remainingAllowed);
    remainingAllowed -= copayAmount;
  }

  // Apply deductible
  if (remainingAllowed > 0 && benefits.deductible > 0) {
    deductibleAmount = Math.min(benefits.deductible, remainingAllowed);
    remainingAllowed -= deductibleAmount;
  }

  // Apply coinsurance to remaining amount
  if (remainingAllowed > 0 && benefits.coinsurance > 0) {
    coinsuranceAmount = remainingAllowed * benefits.coinsurance;
  }

  // Calculate totals
  const totalPatientResponsibility = deductibleAmount + copayAmount + coinsuranceAmount;
  const insurancePayment = updatedEstimate.expectedAllowed - totalPatientResponsibility;

  // Apply out-of-pocket maximum
  if (totalPatientResponsibility > benefits.outOfPocketMax) {
    const adjustment = totalPatientResponsibility - benefits.outOfPocketMax;
    coinsuranceAmount = Math.max(0, coinsuranceAmount - adjustment);
    notes.push('Patient out-of-pocket capped at annual maximum');
  }

  // Update estimate
  updatedEstimate.patientResponsibility = {
    deductible: Math.round(deductibleAmount * 100) / 100,
    copay: Math.round(copayAmount * 100) / 100,
    coinsurance: Math.round(coinsuranceAmount * 100) / 100,
    total: Math.round((deductibleAmount + copayAmount + coinsuranceAmount) * 100) / 100,
  };
  updatedEstimate.insurancePayment = Math.round(insurancePayment * 100) / 100;

  // Update payer info
  if (benefits.planName) {
    updatedEstimate.payerInfo = {
      ...updatedEstimate.payerInfo!,
      planName: benefits.planName,
      isInNetwork: benefits.isInNetwork ?? true,
    };
  }

  // Add benefit limitations to notes
  if (benefits.limitations?.length) {
    notes.push(`Benefit limitations apply: ${benefits.limitations.join('; ')}`);
  }

  // Out-of-network warning
  if (benefits.isInNetwork === false) {
    notes.push('WARNING: Out-of-network; actual costs may be significantly higher');
    updatedEstimate.confidenceLevel = Math.min(updatedEstimate.confidenceLevel, 50);
  }

  updatedEstimate.notes = notes;

  // Distribute patient responsibility across line items proportionally
  const totalAllowed = updatedEstimate.expectedAllowed;
  for (const line of updatedEstimate.breakdown) {
    const proportion = line.expectedPayment / totalAllowed;
    line.patientResponsibility =
      Math.round(updatedEstimate.patientResponsibility.total * proportion * 100) / 100;
  }

  return updatedEstimate;
}

/**
 * Calculate patient out-of-pocket with current accumulators
 *
 * @param estimate - Estimate with benefits applied
 * @param accumulators - Current patient accumulators
 * @returns Updated estimate reflecting accumulator status
 */
export function calculateOutOfPocket(
  estimate: EstimateResult,
  accumulators: Accumulators
): EstimateResult {
  const updatedEstimate: EstimateResult = JSON.parse(JSON.stringify(estimate));
  const notes = [...updatedEstimate.notes];

  // Adjust deductible based on what's already been paid
  let adjustedDeductible = Math.max(
    0,
    updatedEstimate.patientResponsibility.deductible - accumulators.deductiblePaid
  );

  // If deductible is already met, no deductible applies
  if (accumulators.deductibleRemaining <= 0) {
    adjustedDeductible = 0;
    notes.push('Annual deductible already met');
  } else {
    adjustedDeductible = Math.min(
      adjustedDeductible,
      accumulators.deductibleRemaining
    );
  }

  // Recalculate coinsurance based on adjusted deductible
  const deductibleSavings =
    updatedEstimate.patientResponsibility.deductible - adjustedDeductible;
  const adjustedCoinsurance =
    updatedEstimate.patientResponsibility.coinsurance +
    deductibleSavings * 0.2; // Assuming 20% coinsurance on previously deductible amounts

  // Check against out-of-pocket maximum
  const projectedTotal =
    adjustedDeductible +
    updatedEstimate.patientResponsibility.copay +
    adjustedCoinsurance;

  const totalOopAfterService = accumulators.outOfPocketPaid + projectedTotal;
  let finalPatientResponsibility = projectedTotal;

  if (
    accumulators.outOfPocketRemaining <= 0 ||
    totalOopAfterService > accumulators.outOfPocketRemaining + accumulators.outOfPocketPaid
  ) {
    // Cap at remaining OOP
    finalPatientResponsibility = Math.max(0, accumulators.outOfPocketRemaining);
    notes.push('Patient approaching or at annual out-of-pocket maximum');
  }

  // Update the estimate
  updatedEstimate.patientResponsibility = {
    deductible: Math.round(adjustedDeductible * 100) / 100,
    copay: updatedEstimate.patientResponsibility.copay,
    coinsurance: Math.round(
      (finalPatientResponsibility -
        adjustedDeductible -
        updatedEstimate.patientResponsibility.copay) *
        100
    ) / 100,
    total: Math.round(finalPatientResponsibility * 100) / 100,
  };

  updatedEstimate.insurancePayment =
    Math.round(
      (updatedEstimate.expectedAllowed - finalPatientResponsibility) * 100
    ) / 100;

  updatedEstimate.notes = notes;

  return updatedEstimate;
}

/**
 * Compare prices across multiple payers for the same services
 *
 * @param services - Services to compare
 * @param payerIds - Payer IDs to compare (if empty, uses Medicare only)
 * @returns Array of payer comparisons, sorted by patient cost
 */
export function comparePayerPrices(
  services: ServiceItem[],
  payerIds: string[] = []
): PayerComparison[] {
  const comparisons: PayerComparison[] = [];

  // Always include Medicare as baseline
  const medicareEstimate = estimatePrice(services);
  const medicareTotal = medicareEstimate.expectedAllowed;

  comparisons.push({
    payerId: 'MEDICARE',
    payerName: 'Medicare (Baseline)',
    expectedAllowed: medicareTotal,
    patientResponsibility: medicareTotal, // Assuming no secondary
    percentOfMedicare: 100,
    ranking: 0,
  });

  // Compare each payer
  for (const payerId of payerIds) {
    const estimate = estimatePrice(services, payerId);

    comparisons.push({
      payerId,
      payerName: estimate.payerInfo?.payerName || payerId,
      expectedAllowed: estimate.expectedAllowed,
      patientResponsibility: estimate.patientResponsibility.total,
      percentOfMedicare:
        medicareTotal > 0
          ? Math.round((estimate.expectedAllowed / medicareTotal) * 100)
          : 0,
      ranking: 0,
    });
  }

  // Sort by expected allowed and assign rankings
  comparisons.sort((a, b) => a.expectedAllowed - b.expectedAllowed);
  comparisons.forEach((comp, index) => {
    comp.ranking = index + 1;
  });

  return comparisons;
}

/**
 * Create estimate for a bundled service package
 *
 * @param packageName - Name of the package
 * @param services - Services in the package
 * @param payerId - Optional payer ID
 * @param discountPercent - Optional package discount
 * @returns Bundled estimate
 */
export function estimateBundledPackage(
  packageName: string,
  services: ServiceItem[],
  payerId?: string,
  discountPercent: number = 0
): EstimateResult {
  const estimate = estimatePrice(services, payerId);

  // Apply package discount
  if (discountPercent > 0) {
    const discountFactor = 1 - discountPercent / 100;

    estimate.grossCharges = Math.round(estimate.grossCharges * discountFactor * 100) / 100;
    estimate.expectedAllowed =
      Math.round(estimate.expectedAllowed * discountFactor * 100) / 100;
    estimate.contractualAdjustment =
      estimate.grossCharges - estimate.expectedAllowed;
    estimate.patientResponsibility.total =
      Math.round(estimate.expectedAllowed * 100) / 100;

    estimate.notes.push(
      `Package discount of ${discountPercent}% applied for ${packageName}`
    );
  }

  estimate.estimateType = 'bundled';

  return estimate;
}

/**
 * Create estimate for episode of care
 *
 * @param episode - Episode of care definition
 * @param payerId - Optional payer ID
 * @returns Episode estimate
 */
export function estimateEpisodeOfCare(
  episode: EpisodeOfCare,
  payerId?: string
): EstimateResult {
  const allServices: ServiceItem[] = [];

  // Collect all services from the episode
  allServices.push(...episode.services);

  if (episode.phases) {
    for (const phase of episode.phases) {
      allServices.push(...phase.services);
    }
  }

  const estimate = estimatePrice(allServices, payerId);
  estimate.estimateType = 'episode';

  estimate.notes.push(
    `Episode of care: ${episode.name} (typical duration: ${episode.durationDays} days)`
  );

  if (episode.phases) {
    estimate.notes.push(
      `Includes ${episode.phases.length} phases: ${episode.phases.map((p) => p.name).join(', ')}`
    );
  }

  return estimate;
}

/**
 * Format estimate for patient-friendly display
 *
 * @param estimate - Estimate result
 * @returns Formatted strings for display
 */
export function formatEstimateForDisplay(estimate: EstimateResult): {
  totalCost: string;
  yourCost: string;
  insurancePays: string;
  savings: string;
  confidenceText: string;
  validityText: string;
} {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const confidenceTexts: Record<string, string> = {
    high: 'High confidence - based on your specific plan rates',
    medium: 'Medium confidence - some estimates used',
    low: 'Low confidence - limited rate information available',
  };

  let confidenceLevel: 'high' | 'medium' | 'low';
  if (estimate.confidenceLevel >= 75) {
    confidenceLevel = 'high';
  } else if (estimate.confidenceLevel >= 50) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }

  return {
    totalCost: formatCurrency(estimate.grossCharges),
    yourCost: formatCurrency(estimate.patientResponsibility.total),
    insurancePays: formatCurrency(estimate.insurancePayment),
    savings: formatCurrency(estimate.contractualAdjustment),
    confidenceText: confidenceTexts[confidenceLevel],
    validityText: `Valid until ${estimate.validUntil.toLocaleDateString()}`,
  };
}

export default {
  estimatePrice,
  applyBenefits,
  calculateOutOfPocket,
  comparePayerPrices,
  estimateBundledPackage,
  estimateEpisodeOfCare,
  formatEstimateForDisplay,
};
