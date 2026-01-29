/**
 * Denial Predictor
 *
 * Predictive analytics engine for claim denial risk assessment.
 * Uses historical patterns and risk factors to predict denial likelihood.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Risk factors that influence denial prediction
 */
export interface DenialRiskFactors {
  /** Payer ID */
  payerId: string;
  /** CPT/HCPCS procedure code */
  cptCode: string;
  /** Primary diagnosis code (ICD-10) */
  diagnosisCode?: string;
  /** Whether diagnosis matches expected for CPT */
  diagnosisMatch: boolean;
  /** Number of prior denials with this payer */
  priorDenials: number;
  /** Prior denial rate (0-100) */
  priorDenialRate?: number;
  /** Authorization status */
  authStatus: 'NOT_REQUIRED' | 'OBTAINED' | 'PENDING' | 'DENIED' | 'MISSING';
  /** Days until timely filing deadline */
  timelyFiling: number;
  /** Claim total charge amount */
  chargeAmount?: number;
  /** Service type (inpatient, outpatient, ed, etc.) */
  serviceType?: string;
  /** Place of service code */
  placeOfService?: string;
  /** Provider NPI */
  providerNpi?: string;
  /** Is claim a resubmission */
  isResubmission?: boolean;
  /** Modifier codes */
  modifiers?: string[];
}

/**
 * Claim input for prediction
 */
export interface ClaimForPrediction {
  /** Claim ID */
  claimId: string;
  /** Payer ID */
  payerId: string;
  /** Payer name */
  payerName?: string;
  /** CPT codes on claim */
  cptCodes: string[];
  /** ICD-10 diagnosis codes */
  diagnosisCodes: string[];
  /** Total charge amount */
  chargeAmount: number;
  /** Service date */
  serviceDate: Date | string;
  /** Authorization number (if obtained) */
  authorizationNumber?: string;
  /** Authorization status */
  authStatus?: 'NOT_REQUIRED' | 'OBTAINED' | 'PENDING' | 'DENIED' | 'MISSING';
  /** Service type */
  serviceType?: string;
  /** Place of service */
  placeOfService?: string;
  /** Provider NPI */
  providerNpi?: string;
  /** Is this a resubmission */
  isResubmission?: boolean;
  /** Modifiers */
  modifiers?: string[];
  /** Patient age */
  patientAge?: number;
  /** Patient insurance type (primary) */
  insuranceType?: string;
}

/**
 * Denial prediction result
 */
export interface DenialPrediction {
  /** Claim ID */
  claimId: string;
  /** Risk score (0-100, higher = more likely to be denied) */
  riskScore: number;
  /** Risk classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Probability of denial (0-100%) */
  denialProbability: number;
  /** Likely denial reasons */
  likelyReasons: DenialReason[];
  /** Prevention actions */
  preventionActions: PreventionAction[];
  /** Risk factor breakdown */
  riskBreakdown: RiskBreakdown;
  /** Confidence in prediction (0-100) */
  confidence: number;
  /** Recommended actions before submission */
  preSubmissionChecks: string[];
}

/**
 * Likely denial reason
 */
export interface DenialReason {
  /** Reason category */
  category: DenialCategory;
  /** CARC code (if applicable) */
  carcCode?: string;
  /** Description */
  description: string;
  /** Probability this is the reason (0-100) */
  probability: number;
  /** Whether this is preventable */
  preventable: boolean;
}

/**
 * Prevention action
 */
export interface PreventionAction {
  /** Action type */
  action: string;
  /** Priority (1 = highest) */
  priority: number;
  /** Description */
  description: string;
  /** Expected risk reduction (0-100) */
  expectedImpact: number;
  /** Effort level */
  effortLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Risk breakdown by factor
 */
export interface RiskBreakdown {
  /** Payer history risk (0-25) */
  payerHistoryRisk: number;
  /** Code combination risk (0-25) */
  codeCombinationRisk: number;
  /** Missing info risk (0-20) */
  missingInfoRisk: number;
  /** Authorization risk (0-15) */
  authorizationRisk: number;
  /** Timely filing risk (0-15) */
  timelyFilingRisk: number;
}

/**
 * Denial category
 */
export type DenialCategory =
  | 'ELIGIBILITY'
  | 'AUTHORIZATION'
  | 'CODING'
  | 'TIMELY_FILING'
  | 'DUPLICATE'
  | 'MEDICAL_NECESSITY'
  | 'BUNDLING'
  | 'COB'
  | 'TECHNICAL'
  | 'CREDENTIALING'
  | 'MODIFIER'
  | 'OTHER';

/**
 * Historical claim data for training
 */
export interface HistoricalClaimData {
  claimId: string;
  payerId: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  chargeAmount: number;
  authStatus: string;
  wasdenied: boolean;
  denialCategory?: DenialCategory;
  denialCarcCode?: string;
  serviceType?: string;
  placeOfService?: string;
}

// ============================================================================
// MOCK HISTORICAL DATA (for initial predictions)
// ============================================================================

/**
 * Mock payer denial rates (in production, this would come from historical data)
 */
const PAYER_DENIAL_RATES: Record<string, number> = {
  'MEDICARE': 8,
  'MEDICAID': 12,
  'BCBS': 10,
  'AETNA': 14,
  'CIGNA': 13,
  'UNITED': 15,
  'HUMANA': 11,
  'DEFAULT': 12,
};

/**
 * High-risk CPT code patterns
 */
const HIGH_RISK_CPT_PATTERNS: Record<string, { denialRate: number; reasons: string[] }> = {
  '99285': { denialRate: 18, reasons: ['Medical necessity', 'Level of service'] },
  '99284': { denialRate: 15, reasons: ['Level of service'] },
  '99223': { denialRate: 12, reasons: ['Medical necessity', 'Documentation'] },
  '43239': { denialRate: 20, reasons: ['Prior authorization', 'Medical necessity'] },
  '27447': { denialRate: 22, reasons: ['Prior authorization required'] },
  '29881': { denialRate: 16, reasons: ['Medical necessity', 'Conservative treatment first'] },
  '72148': { denialRate: 14, reasons: ['Medical necessity', 'Frequency limits'] },
  '70553': { denialRate: 15, reasons: ['Medical necessity', 'Prior imaging required'] },
};

/**
 * Common diagnosis-CPT mismatch patterns
 */
const DIAGNOSIS_CPT_MISMATCHES: Record<string, string[]> = {
  '99213': ['Z00.00'], // Routine exam with E&M code
  '99214': ['Z00.00', 'Z01.89'],
  '70553': ['R51'], // MRI Brain for just headache (needs more specific)
};

// ============================================================================
// MODEL STATE (would be replaced by ML model in production)
// ============================================================================

interface ModelState {
  payerDenialRates: Map<string, number>;
  cptDenialRates: Map<string, number>;
  payerCptRates: Map<string, number>;
  diagnosisMismatchPatterns: Map<string, Set<string>>;
  trainedAt: Date | null;
  sampleCount: number;
}

const modelState: ModelState = {
  payerDenialRates: new Map(Object.entries(PAYER_DENIAL_RATES)),
  cptDenialRates: new Map(Object.entries(HIGH_RISK_CPT_PATTERNS).map(([k, v]) => [k, v.denialRate])),
  payerCptRates: new Map(),
  diagnosisMismatchPatterns: new Map(
    Object.entries(DIAGNOSIS_CPT_MISMATCHES).map(([k, v]) => [k, new Set(v)])
  ),
  trainedAt: null,
  sampleCount: 0,
};

// ============================================================================
// PREDICTION FUNCTIONS
// ============================================================================

/**
 * Predict denial risk for a claim
 */
export function predictDenialRisk(claim: ClaimForPrediction): DenialPrediction {
  const riskBreakdown = calculateRiskBreakdown(claim);

  // Calculate total risk score
  const rawScore =
    riskBreakdown.payerHistoryRisk +
    riskBreakdown.codeCombinationRisk +
    riskBreakdown.missingInfoRisk +
    riskBreakdown.authorizationRisk +
    riskBreakdown.timelyFilingRisk;

  const riskScore = Math.min(100, Math.max(0, rawScore));

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (riskScore >= 70) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // Calculate denial probability (correlated with risk score)
  const denialProbability = Math.round(riskScore * 0.85);

  // Get denial reasons
  const likelyReasons = getDenialReasons(claim, riskBreakdown);

  // Get prevention actions
  const preventionActions = getPreventionActions(claim, riskBreakdown, likelyReasons);

  // Generate pre-submission checks
  const preSubmissionChecks = generatePreSubmissionChecks(claim, riskBreakdown);

  // Calculate confidence based on available data
  const confidence = calculateConfidence(claim);

  return {
    claimId: claim.claimId,
    riskScore,
    riskLevel,
    denialProbability,
    likelyReasons,
    preventionActions,
    riskBreakdown,
    confidence,
    preSubmissionChecks,
  };
}

/**
 * Calculate risk breakdown by factor
 */
function calculateRiskBreakdown(claim: ClaimForPrediction): RiskBreakdown {
  return {
    payerHistoryRisk: calculatePayerHistoryRisk(claim),
    codeCombinationRisk: calculateCodeCombinationRisk(claim),
    missingInfoRisk: calculateMissingInfoRisk(claim),
    authorizationRisk: calculateAuthorizationRisk(claim),
    timelyFilingRisk: calculateTimelyFilingRisk(claim),
  };
}

/**
 * Calculate payer history risk (0-25)
 */
function calculatePayerHistoryRisk(claim: ClaimForPrediction): number {
  // Get base payer denial rate
  const payerKey = claim.payerId.toUpperCase();
  let baseDenialRate = modelState.payerDenialRates.get(payerKey) ||
    modelState.payerDenialRates.get('DEFAULT') || 12;

  // Check for payer-specific CPT patterns
  for (const cpt of claim.cptCodes) {
    const payerCptKey = `${payerKey}:${cpt}`;
    const payerCptRate = modelState.payerCptRates.get(payerCptKey);
    if (payerCptRate !== undefined) {
      baseDenialRate = Math.max(baseDenialRate, payerCptRate);
    }
  }

  // Normalize to 0-25 range
  return Math.min(25, Math.round(baseDenialRate * 1.5));
}

/**
 * Calculate code combination risk (0-25)
 */
function calculateCodeCombinationRisk(claim: ClaimForPrediction): number {
  let risk = 0;

  // Check CPT-specific denial rates
  for (const cpt of claim.cptCodes) {
    const cptRate = modelState.cptDenialRates.get(cpt) || 0;
    risk = Math.max(risk, cptRate);
  }

  // Check for diagnosis-CPT mismatches
  for (const cpt of claim.cptCodes) {
    const mismatchSet = modelState.diagnosisMismatchPatterns.get(cpt);
    if (mismatchSet) {
      for (const dx of claim.diagnosisCodes) {
        if (mismatchSet.has(dx)) {
          risk += 10;
          break;
        }
      }
    }
  }

  // Check for modifier issues
  if (claim.modifiers && claim.modifiers.length > 0) {
    // Multiple modifiers increase complexity
    if (claim.modifiers.length > 2) {
      risk += 5;
    }
    // Check for common problematic modifier combinations
    if (claim.modifiers.includes('59') && claim.modifiers.includes('XE')) {
      risk += 8; // Conflicting unbundling modifiers
    }
  }

  return Math.min(25, risk);
}

/**
 * Calculate missing info risk (0-20)
 */
function calculateMissingInfoRisk(claim: ClaimForPrediction): number {
  let risk = 0;

  // Missing diagnosis codes
  if (!claim.diagnosisCodes || claim.diagnosisCodes.length === 0) {
    risk += 20;
  } else if (claim.diagnosisCodes.length === 1) {
    // Single diagnosis might not fully support services
    risk += 3;
  }

  // Missing provider NPI
  if (!claim.providerNpi) {
    risk += 5;
  }

  // Missing place of service
  if (!claim.placeOfService) {
    risk += 3;
  }

  // Missing service type for high-value claims
  if (!claim.serviceType && claim.chargeAmount > 5000) {
    risk += 4;
  }

  // Check for incomplete authorization info when required
  if (claim.authStatus === 'MISSING') {
    risk += 8;
  }

  return Math.min(20, risk);
}

/**
 * Calculate authorization risk (0-15)
 */
function calculateAuthorizationRisk(claim: ClaimForPrediction): number {
  let risk = 0;

  switch (claim.authStatus) {
    case 'DENIED':
      risk = 15;
      break;
    case 'MISSING':
      // Check if CPT typically requires auth
      const requiresAuth = claim.cptCodes.some(cpt =>
        HIGH_RISK_CPT_PATTERNS[cpt]?.reasons.includes('Prior authorization required') ||
        HIGH_RISK_CPT_PATTERNS[cpt]?.reasons.includes('Prior authorization')
      );
      risk = requiresAuth ? 12 : 5;
      break;
    case 'PENDING':
      risk = 8;
      break;
    case 'OBTAINED':
      risk = 0;
      break;
    case 'NOT_REQUIRED':
    default:
      risk = 0;
  }

  // High-value procedures typically need auth
  if (claim.chargeAmount > 10000 && claim.authStatus !== 'OBTAINED' && claim.authStatus !== 'NOT_REQUIRED') {
    risk += 5;
  }

  return Math.min(15, risk);
}

/**
 * Calculate timely filing risk (0-15)
 */
function calculateTimelyFilingRisk(claim: ClaimForPrediction): number {
  const serviceDate = new Date(claim.serviceDate);
  const today = new Date();
  const daysSinceService = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

  // Assume 90-day filing limit as default
  const filingLimit = 90;
  const daysRemaining = filingLimit - daysSinceService;

  if (daysRemaining <= 0) {
    return 15; // Past deadline
  } else if (daysRemaining <= 7) {
    return 12; // Critical
  } else if (daysRemaining <= 14) {
    return 8; // Urgent
  } else if (daysRemaining <= 30) {
    return 4; // Warning
  }

  return 0;
}

/**
 * Get likely denial reasons for a claim
 */
export function getDenialReasons(
  claim: ClaimForPrediction,
  riskBreakdown?: RiskBreakdown
): DenialReason[] {
  const breakdown = riskBreakdown || calculateRiskBreakdown(claim);
  const reasons: DenialReason[] = [];

  // Authorization issues
  if (breakdown.authorizationRisk > 8) {
    reasons.push({
      category: 'AUTHORIZATION',
      carcCode: '197',
      description: 'Prior authorization/pre-certification absent or invalid',
      probability: Math.min(90, breakdown.authorizationRisk * 6),
      preventable: true,
    });
  }

  // Timely filing
  if (breakdown.timelyFilingRisk > 10) {
    reasons.push({
      category: 'TIMELY_FILING',
      carcCode: '29',
      description: 'Claim submitted past timely filing deadline',
      probability: Math.min(95, breakdown.timelyFilingRisk * 6),
      preventable: breakdown.timelyFilingRisk < 15,
    });
  }

  // Code combination issues
  if (breakdown.codeCombinationRisk > 15) {
    // Check for medical necessity
    reasons.push({
      category: 'MEDICAL_NECESSITY',
      carcCode: '50',
      description: 'Services not deemed medically necessary for diagnosis',
      probability: Math.min(70, breakdown.codeCombinationRisk * 3),
      preventable: true,
    });

    // Check for bundling
    if (claim.cptCodes.length > 1) {
      reasons.push({
        category: 'BUNDLING',
        carcCode: '97',
        description: 'Services bundled - payment included in allowance for another service',
        probability: Math.min(50, breakdown.codeCombinationRisk * 2),
        preventable: true,
      });
    }
  }

  // Missing information
  if (breakdown.missingInfoRisk > 10) {
    reasons.push({
      category: 'TECHNICAL',
      carcCode: '16',
      description: 'Missing or incomplete claim information',
      probability: Math.min(80, breakdown.missingInfoRisk * 4),
      preventable: true,
    });
  }

  // Payer-specific patterns
  if (breakdown.payerHistoryRisk > 15) {
    reasons.push({
      category: 'OTHER',
      description: 'Historical denial pattern with this payer for similar claims',
      probability: Math.min(60, breakdown.payerHistoryRisk * 3),
      preventable: false,
    });
  }

  // Sort by probability
  reasons.sort((a, b) => b.probability - a.probability);

  return reasons;
}

/**
 * Get prevention actions for a claim
 */
export function getPreventionActions(
  claim: ClaimForPrediction,
  riskBreakdown?: RiskBreakdown,
  _reasons?: DenialReason[]
): PreventionAction[] {
  const breakdown = riskBreakdown || calculateRiskBreakdown(claim);
  const actions: PreventionAction[] = [];
  let priority = 1;

  // Authorization actions
  if (breakdown.authorizationRisk > 5) {
    if (claim.authStatus === 'MISSING' || claim.authStatus === 'DENIED') {
      actions.push({
        action: 'OBTAIN_AUTHORIZATION',
        priority: priority++,
        description: 'Obtain prior authorization before claim submission',
        expectedImpact: Math.min(40, breakdown.authorizationRisk * 3),
        effortLevel: 'MEDIUM',
      });
    } else if (claim.authStatus === 'PENDING') {
      actions.push({
        action: 'FOLLOW_UP_AUTHORIZATION',
        priority: priority++,
        description: 'Follow up on pending authorization status',
        expectedImpact: Math.min(30, breakdown.authorizationRisk * 2),
        effortLevel: 'LOW',
      });
    }
  }

  // Timely filing actions
  if (breakdown.timelyFilingRisk > 0) {
    actions.push({
      action: 'EXPEDITE_SUBMISSION',
      priority: priority++,
      description: 'Prioritize immediate claim submission to meet filing deadline',
      expectedImpact: Math.min(50, breakdown.timelyFilingRisk * 4),
      effortLevel: 'LOW',
    });
  }

  // Missing information actions
  if (breakdown.missingInfoRisk > 5) {
    if (!claim.diagnosisCodes || claim.diagnosisCodes.length < 2) {
      actions.push({
        action: 'ADD_SUPPORTING_DIAGNOSIS',
        priority: priority++,
        description: 'Add supporting diagnosis codes to justify services',
        expectedImpact: 15,
        effortLevel: 'LOW',
      });
    }

    if (!claim.providerNpi) {
      actions.push({
        action: 'ADD_PROVIDER_NPI',
        priority: priority++,
        description: 'Add rendering provider NPI to claim',
        expectedImpact: 10,
        effortLevel: 'LOW',
      });
    }
  }

  // Code combination actions
  if (breakdown.codeCombinationRisk > 10) {
    actions.push({
      action: 'REVIEW_CODE_COMBINATIONS',
      priority: priority++,
      description: 'Review CPT and diagnosis code combinations for medical necessity',
      expectedImpact: 20,
      effortLevel: 'MEDIUM',
    });

    if (claim.cptCodes.length > 1) {
      actions.push({
        action: 'CHECK_BUNDLING_EDITS',
        priority: priority++,
        description: 'Check for NCCI bundling edits between procedure codes',
        expectedImpact: 15,
        effortLevel: 'LOW',
      });
    }
  }

  // Payer-specific actions
  if (breakdown.payerHistoryRisk > 15) {
    actions.push({
      action: 'REVIEW_PAYER_REQUIREMENTS',
      priority: priority++,
      description: 'Review payer-specific requirements and documentation needs',
      expectedImpact: 15,
      effortLevel: 'MEDIUM',
    });
  }

  // High-value claim actions
  if (claim.chargeAmount > 10000) {
    actions.push({
      action: 'PRE_SUBMISSION_REVIEW',
      priority: priority++,
      description: 'Conduct pre-submission review for high-value claim',
      expectedImpact: 20,
      effortLevel: 'MEDIUM',
    });
  }

  return actions;
}

/**
 * Generate pre-submission checks
 */
function generatePreSubmissionChecks(
  claim: ClaimForPrediction,
  riskBreakdown: RiskBreakdown
): string[] {
  const checks: string[] = [];

  // Always include basic checks
  checks.push('Verify patient eligibility and coverage dates');
  checks.push('Confirm all required diagnosis codes are present');

  // Risk-based checks
  if (riskBreakdown.authorizationRisk > 0) {
    checks.push('Verify authorization number is valid and matches services');
  }

  if (riskBreakdown.codeCombinationRisk > 10) {
    checks.push('Run NCCI bundling edit check');
    checks.push('Verify diagnosis codes support medical necessity');
  }

  if (riskBreakdown.payerHistoryRisk > 12) {
    checks.push('Review payer-specific billing guidelines');
    checks.push('Check for any special documentation requirements');
  }

  if (claim.chargeAmount > 5000) {
    checks.push('Ensure all units and charges are accurate');
  }

  if (claim.isResubmission) {
    checks.push('Verify corrections address original denial reason');
    checks.push('Include corrected claim indicator and original reference');
  }

  return checks;
}

/**
 * Calculate prediction confidence
 */
function calculateConfidence(claim: ClaimForPrediction): number {
  let confidence = 70; // Base confidence

  // Increase confidence with more data
  if (claim.diagnosisCodes && claim.diagnosisCodes.length > 0) confidence += 5;
  if (claim.placeOfService) confidence += 3;
  if (claim.serviceType) confidence += 3;
  if (claim.authStatus && claim.authStatus !== 'MISSING') confidence += 5;
  if (claim.providerNpi) confidence += 4;

  // Increase confidence based on model training
  if (modelState.sampleCount > 0) {
    confidence += Math.min(10, Math.log10(modelState.sampleCount + 1) * 5);
  }

  return Math.min(95, Math.max(50, confidence));
}

/**
 * Train the model with historical claim data
 * In production, this would use ML algorithms
 */
export function trainModel(historicalClaims: HistoricalClaimData[]): {
  success: boolean;
  sampleCount: number;
  payerPatterns: number;
  cptPatterns: number;
  trainedAt: Date;
} {
  // Reset model state
  modelState.payerDenialRates = new Map(Object.entries(PAYER_DENIAL_RATES));
  modelState.cptDenialRates = new Map(Object.entries(HIGH_RISK_CPT_PATTERNS).map(([k, v]) => [k, v.denialRate]));
  modelState.payerCptRates = new Map();

  // Aggregate denial rates by payer
  const payerCounts: Map<string, { total: number; denied: number }> = new Map();
  const cptCounts: Map<string, { total: number; denied: number }> = new Map();
  const payerCptCounts: Map<string, { total: number; denied: number }> = new Map();

  for (const claim of historicalClaims) {
    // Payer aggregation
    const payerKey = claim.payerId.toUpperCase();
    const payerData = payerCounts.get(payerKey) || { total: 0, denied: 0 };
    payerData.total++;
    if (claim.wasdenied) payerData.denied++;
    payerCounts.set(payerKey, payerData);

    // CPT aggregation
    for (const cpt of claim.cptCodes) {
      const cptData = cptCounts.get(cpt) || { total: 0, denied: 0 };
      cptData.total++;
      if (claim.wasdenied) cptData.denied++;
      cptCounts.set(cpt, cptData);

      // Payer-CPT combination
      const payerCptKey = `${payerKey}:${cpt}`;
      const payerCptData = payerCptCounts.get(payerCptKey) || { total: 0, denied: 0 };
      payerCptData.total++;
      if (claim.wasdenied) payerCptData.denied++;
      payerCptCounts.set(payerCptKey, payerCptData);
    }
  }

  // Update model with learned rates
  let payerPatterns = 0;
  for (const [payer, data] of payerCounts) {
    if (data.total >= 10) { // Minimum sample size
      const denialRate = Math.round((data.denied / data.total) * 100);
      modelState.payerDenialRates.set(payer, denialRate);
      payerPatterns++;
    }
  }

  let cptPatterns = 0;
  for (const [cpt, data] of cptCounts) {
    if (data.total >= 5) { // Minimum sample size
      const denialRate = Math.round((data.denied / data.total) * 100);
      modelState.cptDenialRates.set(cpt, denialRate);
      cptPatterns++;
    }
  }

  // Store payer-CPT specific patterns
  for (const [key, data] of payerCptCounts) {
    if (data.total >= 5) {
      const denialRate = Math.round((data.denied / data.total) * 100);
      modelState.payerCptRates.set(key, denialRate);
    }
  }

  modelState.trainedAt = new Date();
  modelState.sampleCount = historicalClaims.length;

  return {
    success: true,
    sampleCount: historicalClaims.length,
    payerPatterns,
    cptPatterns,
    trainedAt: modelState.trainedAt,
  };
}

/**
 * Batch predict denial risk for multiple claims
 */
export function batchPredictDenialRisk(claims: ClaimForPrediction[]): DenialPrediction[] {
  return claims.map(claim => predictDenialRisk(claim));
}

/**
 * Get model statistics
 */
export function getModelStats(): {
  trainedAt: Date | null;
  sampleCount: number;
  payerPatternsCount: number;
  cptPatternsCount: number;
  payerCptPatternsCount: number;
} {
  return {
    trainedAt: modelState.trainedAt,
    sampleCount: modelState.sampleCount,
    payerPatternsCount: modelState.payerDenialRates.size,
    cptPatternsCount: modelState.cptDenialRates.size,
    payerCptPatternsCount: modelState.payerCptRates.size,
  };
}
