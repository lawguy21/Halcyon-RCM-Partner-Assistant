/**
 * Payment Matcher
 * Logic for matching ERA payments to claims and calculating variances
 */

import type {
  ClaimPayment,
  PaymentMatchResult,
  PaymentVariance,
  WriteOffRecommendation,
  AdjustmentInfo,
  MatchConfidence,
  ServicePayment,
} from './payment-types.js';

// ============================================================================
// TYPES FOR MATCHING
// ============================================================================

/**
 * Claim record from the system for matching
 */
export interface SystemClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientDob?: Date;
  billedAmount: number;
  expectedPayment?: number;
  dateOfService?: Date;
  payerId?: string;
  payerName?: string;
  status: string;
}

/**
 * Patient record for secondary matching
 */
export interface SystemPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  memberId?: string;
  ssn?: string;
}

/**
 * Write-off code mapping
 */
export interface WriteOffCodeMapping {
  carcCode: string;
  groupCode: string;
  writeOffCode: string;
  description: string;
  requiresApproval: boolean;
  autoPostEligible: boolean;
}

// ============================================================================
// DEFAULT WRITE-OFF MAPPINGS
// ============================================================================

/**
 * Default CARC to write-off code mappings
 * These should be customized per organization
 */
const DEFAULT_WRITEOFF_MAPPINGS: WriteOffCodeMapping[] = [
  // Contractual adjustments - typically auto-postable
  { carcCode: '45', groupCode: 'CO', writeOffCode: 'CONT-ADJ', description: 'Contractual Adjustment - Charges exceed fee schedule', requiresApproval: false, autoPostEligible: true },
  { carcCode: '42', groupCode: 'CO', writeOffCode: 'CONT-ADJ', description: 'Contractual Adjustment - Charges exceed contract', requiresApproval: false, autoPostEligible: true },
  { carcCode: '131', groupCode: 'CO', writeOffCode: 'CONT-ADJ', description: 'Contractual Adjustment - Network discount', requiresApproval: false, autoPostEligible: true },
  { carcCode: '253', groupCode: 'CO', writeOffCode: 'SEQ-ADJ', description: 'Sequestration Adjustment', requiresApproval: false, autoPostEligible: true },

  // Patient responsibility - not write-offs
  { carcCode: '1', groupCode: 'PR', writeOffCode: 'PT-DEDUCT', description: 'Patient Deductible', requiresApproval: false, autoPostEligible: true },
  { carcCode: '2', groupCode: 'PR', writeOffCode: 'PT-COINS', description: 'Patient Coinsurance', requiresApproval: false, autoPostEligible: true },
  { carcCode: '3', groupCode: 'PR', writeOffCode: 'PT-COPAY', description: 'Patient Copay', requiresApproval: false, autoPostEligible: true },

  // Denials - require review
  { carcCode: '4', groupCode: 'CO', writeOffCode: 'DENY-MOD', description: 'Procedure code inconsistent with modifier', requiresApproval: true, autoPostEligible: false },
  { carcCode: '5', groupCode: 'CO', writeOffCode: 'DENY-COB', description: 'Procedure code inconsistent with POS', requiresApproval: true, autoPostEligible: false },
  { carcCode: '16', groupCode: 'CO', writeOffCode: 'DENY-INFO', description: 'Missing/incomplete claim information', requiresApproval: true, autoPostEligible: false },
  { carcCode: '18', groupCode: 'CO', writeOffCode: 'DENY-DUP', description: 'Duplicate claim/service', requiresApproval: true, autoPostEligible: false },
  { carcCode: '22', groupCode: 'CO', writeOffCode: 'DENY-COB', description: 'Coordination of benefits', requiresApproval: true, autoPostEligible: false },
  { carcCode: '27', groupCode: 'CO', writeOffCode: 'DENY-ELIG', description: 'Patient not covered', requiresApproval: true, autoPostEligible: false },
  { carcCode: '29', groupCode: 'CO', writeOffCode: 'DENY-TIME', description: 'Timely filing limit exceeded', requiresApproval: true, autoPostEligible: false },
  { carcCode: '50', groupCode: 'CO', writeOffCode: 'DENY-NONCOV', description: 'Non-covered service', requiresApproval: true, autoPostEligible: false },
  { carcCode: '96', groupCode: 'CO', writeOffCode: 'DENY-NONCOV', description: 'Non-covered charge', requiresApproval: true, autoPostEligible: false },
  { carcCode: '97', groupCode: 'CO', writeOffCode: 'DENY-AUTH', description: 'Authorization required', requiresApproval: true, autoPostEligible: false },
  { carcCode: '109', groupCode: 'CO', writeOffCode: 'DENY-NOT-COV', description: 'Claim not covered by this payer', requiresApproval: true, autoPostEligible: false },
  { carcCode: '197', groupCode: 'CO', writeOffCode: 'DENY-AUTH', description: 'Prior authorization required', requiresApproval: true, autoPostEligible: false },

  // Medical necessity
  { carcCode: '50', groupCode: 'PI', writeOffCode: 'DENY-MEDNEC', description: 'Medical necessity not established', requiresApproval: true, autoPostEligible: false },
  { carcCode: '56', groupCode: 'PI', writeOffCode: 'DENY-MEDNEC', description: 'Service not medically necessary', requiresApproval: true, autoPostEligible: false },

  // Bundling
  { carcCode: '59', groupCode: 'CO', writeOffCode: 'BUNDLE', description: 'Service bundled into another', requiresApproval: true, autoPostEligible: false },
  { carcCode: '97', groupCode: 'CO', writeOffCode: 'BUNDLE', description: 'Payment included in allowance for another service', requiresApproval: true, autoPostEligible: false },

  // Corrected claim
  { carcCode: 'B1', groupCode: 'CO', writeOffCode: 'CORRECTED', description: 'Non-covered unless submitted on corrected claim', requiresApproval: true, autoPostEligible: false },
];

// ============================================================================
// PAYMENT MATCHER CLASS
// ============================================================================

export class PaymentMatcher {
  private writeOffMappings: WriteOffCodeMapping[];

  constructor(customMappings?: WriteOffCodeMapping[]) {
    this.writeOffMappings = customMappings || DEFAULT_WRITEOFF_MAPPINGS;
  }

  /**
   * Match a payment to a claim by claim number
   */
  matchPaymentToClaim(
    payment: ClaimPayment,
    claims: SystemClaim[]
  ): PaymentMatchResult {
    // Try exact claim number match first
    const exactMatch = claims.find(
      c => c.claimNumber.toLowerCase() === payment.claimNumber.toLowerCase()
    );

    if (exactMatch) {
      const variance = this.calculateVariance(
        exactMatch.expectedPayment || exactMatch.billedAmount,
        payment.paidAmount
      );

      return {
        eraPayment: payment,
        matchedClaimId: exactMatch.id,
        confidence: 'HIGH',
        matchMethod: 'CLAIM_NUMBER',
        variance: variance.varianceAmount !== 0 ? variance : undefined,
        suggestedActions: this.getSuggestedActions(payment, variance),
      };
    }

    // Try matching by payer claim control number (ICN)
    if (payment.payerClaimControlNumber) {
      const icnMatch = claims.find(
        c => c.claimNumber === payment.payerClaimControlNumber
      );

      if (icnMatch) {
        const variance = this.calculateVariance(
          icnMatch.expectedPayment || icnMatch.billedAmount,
          payment.paidAmount
        );

        return {
          eraPayment: payment,
          matchedClaimId: icnMatch.id,
          confidence: 'HIGH',
          matchMethod: 'CLAIM_NUMBER',
          variance: variance.varianceAmount !== 0 ? variance : undefined,
          suggestedActions: this.getSuggestedActions(payment, variance),
        };
      }
    }

    // Try fuzzy claim number match (handle leading zeros, etc.)
    const normalizedPaymentNum = this.normalizeClaimNumber(payment.claimNumber);
    const fuzzyMatch = claims.find(
      c => this.normalizeClaimNumber(c.claimNumber) === normalizedPaymentNum
    );

    if (fuzzyMatch) {
      const variance = this.calculateVariance(
        fuzzyMatch.expectedPayment || fuzzyMatch.billedAmount,
        payment.paidAmount
      );

      return {
        eraPayment: payment,
        matchedClaimId: fuzzyMatch.id,
        confidence: 'MEDIUM',
        matchMethod: 'CLAIM_NUMBER',
        variance: variance.varianceAmount !== 0 ? variance : undefined,
        suggestedActions: this.getSuggestedActions(payment, variance),
      };
    }

    // No match found
    return {
      eraPayment: payment,
      confidence: 'LOW',
      matchMethod: 'CLAIM_NUMBER',
      suggestedActions: ['Review payment manually', 'Verify claim number in ERA matches system'],
    };
  }

  /**
   * Match payment to patient records
   */
  matchByPatient(
    payment: ClaimPayment,
    patients: SystemPatient[]
  ): SystemPatient | null {
    // Try matching by member ID
    if (payment.patient.id) {
      const memberMatch = patients.find(
        p => p.memberId?.toLowerCase() === payment.patient.id?.toLowerCase()
      );
      if (memberMatch) return memberMatch;
    }

    // Try matching by name and DOB (if we have insured info)
    if (payment.insured) {
      const nameMatch = patients.find(p =>
        p.lastName.toLowerCase() === payment.insured?.lastName.toLowerCase() &&
        p.firstName?.toLowerCase() === payment.insured?.firstName?.toLowerCase()
      );
      if (nameMatch) return nameMatch;
    }

    // Try matching by patient name
    if (payment.patient.lastName) {
      const patientNameMatch = patients.find(p =>
        p.lastName.toLowerCase() === payment.patient.lastName.toLowerCase() &&
        p.firstName?.toLowerCase() === payment.patient.firstName?.toLowerCase()
      );
      if (patientNameMatch) return patientNameMatch;
    }

    return null;
  }

  /**
   * Match payment to claims using patient info
   */
  matchPaymentByPatient(
    payment: ClaimPayment,
    claims: SystemClaim[],
    patients: SystemPatient[]
  ): PaymentMatchResult {
    const patient = this.matchByPatient(payment, patients);

    if (!patient) {
      return {
        eraPayment: payment,
        confidence: 'LOW',
        matchMethod: 'PATIENT',
        suggestedActions: ['Patient not found in system', 'Review payment manually'],
      };
    }

    // Find claims for this patient
    const patientClaims = claims.filter(c => c.patientId === patient.id);

    if (patientClaims.length === 0) {
      return {
        eraPayment: payment,
        confidence: 'LOW',
        matchMethod: 'PATIENT',
        suggestedActions: ['No claims found for patient', 'Verify patient registration'],
      };
    }

    // If only one claim, high confidence
    if (patientClaims.length === 1) {
      const claim = patientClaims[0];
      const variance = this.calculateVariance(
        claim.expectedPayment || claim.billedAmount,
        payment.paidAmount
      );

      return {
        eraPayment: payment,
        matchedClaimId: claim.id,
        confidence: 'MEDIUM',
        matchMethod: 'PATIENT',
        variance: variance.varianceAmount !== 0 ? variance : undefined,
        suggestedActions: this.getSuggestedActions(payment, variance),
      };
    }

    // Multiple claims - try to match by amount
    const amountMatch = patientClaims.find(
      c => Math.abs(c.billedAmount - payment.billedAmount) < 0.01
    );

    if (amountMatch) {
      const variance = this.calculateVariance(
        amountMatch.expectedPayment || amountMatch.billedAmount,
        payment.paidAmount
      );

      return {
        eraPayment: payment,
        matchedClaimId: amountMatch.id,
        confidence: 'MEDIUM',
        matchMethod: 'AMOUNT',
        variance: variance.varianceAmount !== 0 ? variance : undefined,
        suggestedActions: this.getSuggestedActions(payment, variance),
      };
    }

    // Multiple claims, no clear match
    return {
      eraPayment: payment,
      confidence: 'LOW',
      matchMethod: 'PATIENT',
      suggestedActions: [
        `Multiple claims found for patient (${patientClaims.length})`,
        'Review manually to determine correct claim',
      ],
    };
  }

  /**
   * Calculate variance between expected and actual payment
   */
  calculateVariance(expectedAmount: number, actualAmount: number): PaymentVariance {
    const varianceAmount = actualAmount - expectedAmount;
    const variancePercentage = expectedAmount !== 0
      ? (varianceAmount / expectedAmount) * 100
      : actualAmount !== 0 ? 100 : 0;

    let reason: string | undefined;

    if (Math.abs(varianceAmount) < 0.01) {
      reason = 'Payment matches expected amount';
    } else if (varianceAmount < 0) {
      if (variancePercentage < -50) {
        reason = 'Significant underpayment - review for possible denial or adjustment';
      } else if (variancePercentage < -10) {
        reason = 'Underpayment - may need fee schedule review';
      } else {
        reason = 'Minor underpayment - likely contractual adjustment';
      }
    } else {
      reason = 'Overpayment - verify payment accuracy';
    }

    return {
      expectedAmount,
      actualAmount,
      varianceAmount,
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      reason,
      isUnderpayment: varianceAmount < -0.01,
    };
  }

  /**
   * Suggest write-off codes for adjustments
   */
  suggestWriteOff(adjustment: AdjustmentInfo): WriteOffRecommendation {
    // Find mapping for this CARC code
    const mapping = this.writeOffMappings.find(
      m => m.carcCode === adjustment.reasonCode && m.groupCode === adjustment.groupCode
    );

    if (mapping) {
      return {
        adjustment,
        writeOffCode: mapping.writeOffCode,
        reason: mapping.description,
        amount: adjustment.amount,
        requiresApproval: mapping.requiresApproval,
        autoPostEligible: mapping.autoPostEligible,
      };
    }

    // Default handling based on group code
    const groupDefaults: Record<string, Partial<WriteOffRecommendation>> = {
      'CO': { writeOffCode: 'CONT-ADJ', reason: 'Contractual Adjustment', requiresApproval: false, autoPostEligible: true },
      'PR': { writeOffCode: 'PT-RESP', reason: 'Patient Responsibility', requiresApproval: false, autoPostEligible: true },
      'OA': { writeOffCode: 'OTHER-ADJ', reason: 'Other Adjustment', requiresApproval: true, autoPostEligible: false },
      'PI': { writeOffCode: 'PAYER-ADJ', reason: 'Payer Initiated Adjustment', requiresApproval: true, autoPostEligible: false },
      'CR': { writeOffCode: 'CORRECTION', reason: 'Correction/Reversal', requiresApproval: true, autoPostEligible: false },
    };

    const defaults = groupDefaults[adjustment.groupCode] || groupDefaults['OA'];

    return {
      adjustment,
      writeOffCode: defaults.writeOffCode || 'UNKNOWN',
      reason: `${defaults.reason} - CARC ${adjustment.reasonCode}`,
      amount: adjustment.amount,
      requiresApproval: defaults.requiresApproval ?? true,
      autoPostEligible: defaults.autoPostEligible ?? false,
    };
  }

  /**
   * Get all write-off recommendations for a payment
   */
  getWriteOffRecommendations(payment: ClaimPayment): WriteOffRecommendation[] {
    const recommendations: WriteOffRecommendation[] = [];

    // Process claim-level adjustments
    for (const adj of payment.adjustments) {
      recommendations.push(this.suggestWriteOff(adj));
    }

    // Process service-level adjustments
    for (const svc of payment.services) {
      for (const adj of svc.adjustments) {
        recommendations.push(this.suggestWriteOff(adj));
      }
    }

    return recommendations;
  }

  /**
   * Determine if payment can be auto-posted
   */
  canAutoPost(payment: ClaimPayment, matchResult: PaymentMatchResult): boolean {
    // Cannot auto-post if no match or low confidence
    if (!matchResult.matchedClaimId || matchResult.confidence === 'LOW') {
      return false;
    }

    // Cannot auto-post denials
    if (payment.status === '4') {
      return false;
    }

    // Cannot auto-post if significant variance
    if (matchResult.variance && Math.abs(matchResult.variance.variancePercentage) > 10) {
      return false;
    }

    // Check all adjustments are auto-post eligible
    const writeOffs = this.getWriteOffRecommendations(payment);
    const hasNonAutoPostable = writeOffs.some(wo => !wo.autoPostEligible);

    return !hasNonAutoPostable;
  }

  /**
   * Get suggested actions based on payment and variance
   */
  private getSuggestedActions(payment: ClaimPayment, variance: PaymentVariance): string[] {
    const actions: string[] = [];

    // Denial handling
    if (payment.status === '4') {
      actions.push('Claim denied - review denial reason codes');
      actions.push('Consider appeal if appropriate');
      return actions;
    }

    // Variance handling
    if (variance.isUnderpayment) {
      if (variance.variancePercentage < -25) {
        actions.push('Significant underpayment detected');
        actions.push('Review contract terms and fee schedule');
        actions.push('Consider appeal for underpayment');
      } else if (variance.variancePercentage < -5) {
        actions.push('Minor underpayment - verify adjustments are correct');
      }
    } else if (variance.varianceAmount > 0.01) {
      actions.push('Overpayment detected - may require refund');
    }

    // Check for patient responsibility
    const prAdjustments = [
      ...payment.adjustments.filter(a => a.groupCode === 'PR'),
      ...payment.services.flatMap(s => s.adjustments.filter(a => a.groupCode === 'PR')),
    ];

    if (prAdjustments.length > 0) {
      const totalPR = prAdjustments.reduce((sum, a) => sum + a.amount, 0);
      actions.push(`Patient responsibility: $${totalPR.toFixed(2)}`);
    }

    // Check for non-covered services
    const nonCovered = payment.services.filter(
      s => s.adjustments.some(a => ['50', '96', '109'].includes(a.reasonCode))
    );
    if (nonCovered.length > 0) {
      actions.push(`${nonCovered.length} service(s) not covered`);
    }

    if (actions.length === 0) {
      actions.push('Ready for posting');
    }

    return actions;
  }

  /**
   * Normalize claim number for fuzzy matching
   */
  private normalizeClaimNumber(claimNumber: string): string {
    // Remove leading zeros, dashes, spaces
    return claimNumber
      .replace(/^0+/, '')
      .replace(/[-\s]/g, '')
      .toLowerCase();
  }

  /**
   * Batch match payments to claims
   */
  batchMatchPayments(
    payments: ClaimPayment[],
    claims: SystemClaim[],
    patients?: SystemPatient[]
  ): PaymentMatchResult[] {
    const results: PaymentMatchResult[] = [];

    for (const payment of payments) {
      // Try claim number match first
      let result = this.matchPaymentToClaim(payment, claims);

      // If no match and we have patients, try patient matching
      if (!result.matchedClaimId && patients && patients.length > 0) {
        result = this.matchPaymentByPatient(payment, claims, patients);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get match statistics for a batch
   */
  getMatchStatistics(results: PaymentMatchResult[]): {
    total: number;
    matched: number;
    unmatched: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    autoPostEligible: number;
    requiresReview: number;
  } {
    const stats = {
      total: results.length,
      matched: 0,
      unmatched: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      autoPostEligible: 0,
      requiresReview: 0,
    };

    for (const result of results) {
      if (result.matchedClaimId) {
        stats.matched++;
      } else {
        stats.unmatched++;
      }

      switch (result.confidence) {
        case 'HIGH': stats.highConfidence++; break;
        case 'MEDIUM': stats.mediumConfidence++; break;
        case 'LOW': stats.lowConfidence++; break;
      }

      if (this.canAutoPost(result.eraPayment, result)) {
        stats.autoPostEligible++;
      } else {
        stats.requiresReview++;
      }
    }

    return stats;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a payment matcher with default settings
 */
export function createPaymentMatcher(
  customMappings?: WriteOffCodeMapping[]
): PaymentMatcher {
  return new PaymentMatcher(customMappings);
}

/**
 * Match a single payment to claims
 */
export function matchPaymentToClaim(
  payment: ClaimPayment,
  claims: SystemClaim[]
): PaymentMatchResult {
  const matcher = new PaymentMatcher();
  return matcher.matchPaymentToClaim(payment, claims);
}

/**
 * Match payment by patient information
 */
export function matchByPatient(
  payment: ClaimPayment,
  claims: SystemClaim[],
  patients: SystemPatient[]
): PaymentMatchResult {
  const matcher = new PaymentMatcher();
  return matcher.matchPaymentByPatient(payment, claims, patients);
}

/**
 * Calculate variance between expected and actual amounts
 */
export function calculateVariance(
  expectedAmount: number,
  actualAmount: number
): PaymentVariance {
  const matcher = new PaymentMatcher();
  return matcher.calculateVariance(expectedAmount, actualAmount);
}

/**
 * Get write-off suggestion for an adjustment
 */
export function suggestWriteOff(adjustment: AdjustmentInfo): WriteOffRecommendation {
  const matcher = new PaymentMatcher();
  return matcher.suggestWriteOff(adjustment);
}
