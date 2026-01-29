/**
 * Denial Management Engine
 *
 * Analyzes claim denials using CARC/RARC codes, determines appropriate
 * appeal strategies, and tracks denial patterns for process improvement.
 *
 * Key features:
 * - CARC/RARC code analysis and interpretation
 * - Appeal recommendation and timeline tracking
 * - Denial pattern analysis
 * - Recovery probability estimation
 */

// ============================================================================
// TYPES
// ============================================================================

export type DenialCategory =
  | 'eligibility'
  | 'authorization'
  | 'medical_necessity'
  | 'coding'
  | 'timely_filing'
  | 'duplicate'
  | 'bundling'
  | 'coordination_of_benefits'
  | 'patient_responsibility'
  | 'contract'
  | 'technical'
  | 'other';

export type AppealLevel = 'first' | 'second' | 'third' | 'external' | 'alj';

export type AppealStatus = 'pending' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'partial';

// ============================================================================
// INPUT INTERFACES
// ============================================================================

export interface DenialInput {
  /** Original claim ID */
  claimId: string;
  /** Date of service */
  dateOfService: Date;
  /** Original billed amount */
  billedAmount: number;
  /** CARC (Claim Adjustment Reason Code) */
  carcCode: string;
  /** RARC (Remittance Advice Remark Code) - optional */
  rarcCode?: string;
  /** Payer ID or name */
  payerId: string;
  /** Date denial was received */
  denialDate: Date;
  /** Current appeal level */
  currentAppealLevel?: AppealLevel;
  /** Previous appeal attempts */
  previousAppeals?: AppealAttempt[];
  /** Supporting documentation available */
  hasDocumentation?: boolean;
}

export interface AppealAttempt {
  /** Appeal level */
  level: AppealLevel;
  /** Date submitted */
  submittedDate: Date;
  /** Date resolved */
  resolvedDate?: Date;
  /** Outcome */
  status: AppealStatus;
  /** Amount recovered */
  amountRecovered?: number;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

export interface DenialAnalysisResult {
  /** Categorization of the denial */
  denialCategory: DenialCategory;
  /** Human-readable description of the denial reason */
  denialDescription: string;
  /** Whether the denial is appealable */
  isAppealable: boolean;
  /** Recommended appeal level */
  recommendedAppealLevel: AppealLevel;
  /** Appeal deadline */
  appealDeadline: Date;
  /** Days until appeal deadline */
  daysUntilDeadline: number;
  /** Probability of successful appeal (0-100) */
  recoveryProbability: number;
  /** Estimated recovery amount */
  estimatedRecovery: number;
  /** Recommended actions */
  actions: string[];
  /** Required documentation for appeal */
  requiredDocumentation: string[];
  /** Notes about the denial */
  notes: string[];
}

// ============================================================================
// CARC CODE DATABASE
// ============================================================================

interface CARCCodeInfo {
  code: string;
  description: string;
  category: DenialCategory;
  appealable: boolean;
  baseRecoveryRate: number;
  commonDocumentation: string[];
}

const CARC_CODES: Record<string, CARCCodeInfo> = {
  '1': {
    code: '1',
    description: 'Deductible amount',
    category: 'patient_responsibility',
    appealable: false,
    baseRecoveryRate: 0,
    commonDocumentation: []
  },
  '2': {
    code: '2',
    description: 'Coinsurance amount',
    category: 'patient_responsibility',
    appealable: false,
    baseRecoveryRate: 0,
    commonDocumentation: []
  },
  '3': {
    code: '3',
    description: 'Co-payment amount',
    category: 'patient_responsibility',
    appealable: false,
    baseRecoveryRate: 0,
    commonDocumentation: []
  },
  '4': {
    code: '4',
    description: 'Procedure code inconsistent with modifier or other procedure code',
    category: 'coding',
    appealable: true,
    baseRecoveryRate: 0.65,
    commonDocumentation: ['Operative report', 'Medical records', 'Coding rationale']
  },
  '5': {
    code: '5',
    description: 'Procedure code inconsistent with place of service',
    category: 'coding',
    appealable: true,
    baseRecoveryRate: 0.60,
    commonDocumentation: ['Medical records', 'Place of service documentation']
  },
  '16': {
    code: '16',
    description: 'Claim/service lacks information or has submission/billing error',
    category: 'technical',
    appealable: true,
    baseRecoveryRate: 0.80,
    commonDocumentation: ['Corrected claim form', 'Missing information']
  },
  '18': {
    code: '18',
    description: 'Duplicate claim/service',
    category: 'duplicate',
    appealable: true,
    baseRecoveryRate: 0.30,
    commonDocumentation: ['Explanation of distinct services', 'Medical records']
  },
  '22': {
    code: '22',
    description: 'Coordination of Benefits - payment made by primary payer',
    category: 'coordination_of_benefits',
    appealable: true,
    baseRecoveryRate: 0.50,
    commonDocumentation: ['Primary payer EOB', 'COB information']
  },
  '26': {
    code: '26',
    description: 'Expenses incurred prior to coverage',
    category: 'eligibility',
    appealable: true,
    baseRecoveryRate: 0.25,
    commonDocumentation: ['Eligibility verification', 'Coverage dates documentation']
  },
  '27': {
    code: '27',
    description: 'Expenses incurred after coverage terminated',
    category: 'eligibility',
    appealable: true,
    baseRecoveryRate: 0.25,
    commonDocumentation: ['Eligibility verification', 'Coverage dates documentation']
  },
  '29': {
    code: '29',
    description: 'Timely filing limit',
    category: 'timely_filing',
    appealable: true,
    baseRecoveryRate: 0.20,
    commonDocumentation: ['Proof of timely submission', 'Clearinghouse reports']
  },
  '50': {
    code: '50',
    description: 'Medical necessity - non-covered services',
    category: 'medical_necessity',
    appealable: true,
    baseRecoveryRate: 0.45,
    commonDocumentation: ['Medical records', 'Physician attestation', 'Clinical guidelines']
  },
  '55': {
    code: '55',
    description: 'Procedure/treatment/service not covered',
    category: 'contract',
    appealable: true,
    baseRecoveryRate: 0.30,
    commonDocumentation: ['Contract documentation', 'Medical necessity letter']
  },
  '96': {
    code: '96',
    description: 'Non-covered charges',
    category: 'contract',
    appealable: true,
    baseRecoveryRate: 0.35,
    commonDocumentation: ['Contract review', 'Coverage determination']
  },
  '97': {
    code: '97',
    description: 'Benefit for this service is included in payment for another service',
    category: 'bundling',
    appealable: true,
    baseRecoveryRate: 0.40,
    commonDocumentation: ['Unbundling rationale', 'Medical records', 'Modifier documentation']
  },
  '109': {
    code: '109',
    description: 'Claim not covered by this payer',
    category: 'eligibility',
    appealable: true,
    baseRecoveryRate: 0.30,
    commonDocumentation: ['Eligibility verification', 'Primary payer information']
  },
  '197': {
    code: '197',
    description: 'Precertification/authorization/notification absent',
    category: 'authorization',
    appealable: true,
    baseRecoveryRate: 0.50,
    commonDocumentation: ['Retroactive auth request', 'Medical necessity', 'Urgency documentation']
  },
  '204': {
    code: '204',
    description: 'Service not authorized on the date(s) of service',
    category: 'authorization',
    appealable: true,
    baseRecoveryRate: 0.45,
    commonDocumentation: ['Authorization documentation', 'Date correction request']
  }
};

// ============================================================================
// APPEAL TIMELINES BY PAYER TYPE
// ============================================================================

const APPEAL_TIMELINES: Record<string, number> = {
  'medicare': 120,
  'medicaid': 60,
  'commercial': 180,
  'default': 90
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get CARC code information
 */
function getCARCInfo(carcCode: string): CARCCodeInfo {
  return CARC_CODES[carcCode] || {
    code: carcCode,
    description: 'Unknown denial reason code',
    category: 'other' as DenialCategory,
    appealable: true,
    baseRecoveryRate: 0.30,
    commonDocumentation: ['Medical records', 'Claim documentation']
  };
}

/**
 * Determine payer type from payer ID
 */
function getPayerType(payerId: string): string {
  const lowerPayerId = payerId.toLowerCase();
  if (lowerPayerId.includes('medicare') || lowerPayerId.includes('cms')) {
    return 'medicare';
  }
  if (lowerPayerId.includes('medicaid')) {
    return 'medicaid';
  }
  return 'commercial';
}

/**
 * Calculate appeal deadline
 */
function calculateAppealDeadline(denialDate: Date, payerId: string): Date {
  const payerType = getPayerType(payerId);
  const daysAllowed = APPEAL_TIMELINES[payerType] ?? APPEAL_TIMELINES['default'] ?? 90;
  const deadline = new Date(denialDate);
  deadline.setDate(deadline.getDate() + daysAllowed);
  return deadline;
}

/**
 * Determine recommended appeal level
 */
function determineAppealLevel(previousAppeals?: AppealAttempt[]): AppealLevel {
  if (!previousAppeals || previousAppeals.length === 0) {
    return 'first';
  }

  const lastAppeal = previousAppeals[previousAppeals.length - 1];
  if (lastAppeal && (lastAppeal.status === 'denied' || lastAppeal.status === 'partial')) {
    switch (lastAppeal.level) {
      case 'first': return 'second';
      case 'second': return 'third';
      case 'third': return 'external';
      case 'external': return 'alj';
      default: return 'first';
    }
  }

  return 'first';
}

/**
 * Calculate recovery probability
 */
function calculateRecoveryProbability(
  carcInfo: CARCCodeInfo,
  hasDocumentation: boolean,
  previousAppeals?: AppealAttempt[]
): number {
  let probability = carcInfo.baseRecoveryRate * 100;

  if (hasDocumentation) {
    probability += 15;
  } else {
    probability -= 20;
  }

  if (previousAppeals && previousAppeals.length > 0) {
    const successfulAppeals = previousAppeals.filter(a => a.status === 'approved' || a.status === 'partial');
    if (successfulAppeals.length > 0) {
      probability += 10;
    } else {
      probability -= 10 * previousAppeals.length;
    }
  }

  return Math.max(5, Math.min(95, probability));
}

/**
 * Generate required documentation list
 */
function generateRequiredDocumentation(carcInfo: CARCCodeInfo, denialCategory: DenialCategory): string[] {
  const docs = [...carcInfo.commonDocumentation];

  // Add category-specific documentation
  switch (denialCategory) {
    case 'eligibility':
      if (!docs.includes('Eligibility verification')) docs.push('Eligibility verification');
      if (!docs.includes('Coverage dates documentation')) docs.push('Coverage dates documentation');
      break;
    case 'authorization':
      if (!docs.includes('Authorization request form')) docs.push('Authorization request form');
      if (!docs.includes('Medical necessity letter')) docs.push('Medical necessity letter');
      break;
    case 'medical_necessity':
      if (!docs.includes('Physician attestation')) docs.push('Physician attestation');
      if (!docs.includes('Clinical guidelines reference')) docs.push('Clinical guidelines reference');
      if (!docs.includes('Peer-reviewed literature')) docs.push('Peer-reviewed literature');
      break;
    case 'coding':
      if (!docs.includes('Certified coder review')) docs.push('Certified coder review');
      if (!docs.includes('Operative/procedure notes')) docs.push('Operative/procedure notes');
      break;
    case 'timely_filing':
      if (!docs.includes('Clearinghouse submission report')) docs.push('Clearinghouse submission report');
      if (!docs.includes('Payer acknowledgment')) docs.push('Payer acknowledgment');
      break;
  }

  // Always include
  if (!docs.includes('Appeal letter')) docs.push('Appeal letter');
  if (!docs.includes('Original claim documentation')) docs.push('Original claim documentation');

  return docs;
}

/**
 * Generate recommended actions
 */
function generateActions(
  denialCategory: DenialCategory,
  isAppealable: boolean,
  daysUntilDeadline: number,
  hasDocumentation: boolean,
  recoveryProbability: number
): string[] {
  const actions: string[] = [];

  if (daysUntilDeadline < 0) {
    actions.push('URGENT: Appeal deadline has passed - evaluate late appeal options');
    actions.push('Check for good cause exception provisions');
    actions.push('Consider write-off if no viable appeal path');
    return actions;
  }

  if (daysUntilDeadline <= 14) {
    actions.push('URGENT: Appeal deadline approaching - prioritize submission');
  }

  if (!isAppealable) {
    actions.push('Denial is not appealable - consider alternative recovery paths');
    if (denialCategory === 'patient_responsibility') {
      actions.push('Transfer balance to patient responsibility');
      actions.push('Initiate patient billing workflow');
    }
    return actions;
  }

  if (!hasDocumentation) {
    actions.push('Gather required documentation before appeal submission');
  }

  if (recoveryProbability >= 60) {
    actions.push('High probability of success - proceed with appeal');
  } else if (recoveryProbability >= 40) {
    actions.push('Moderate probability - strengthen documentation before appeal');
  } else {
    actions.push('Low probability - consider cost-benefit of appeal');
  }

  // Category-specific actions
  switch (denialCategory) {
    case 'eligibility':
      actions.push('Verify patient eligibility on date of service');
      actions.push('Check for retroactive coverage options');
      break;
    case 'authorization':
      actions.push('Request retroactive authorization if available');
      actions.push('Document medical necessity and urgency');
      break;
    case 'medical_necessity':
      actions.push('Obtain physician peer-to-peer review if available');
      actions.push('Reference clinical guidelines supporting treatment');
      break;
    case 'coding':
      actions.push('Have certified coder review documentation');
      actions.push('Consider requesting external coding audit');
      break;
    case 'timely_filing':
      actions.push('Document proof of original timely submission');
      actions.push('Reference payer delays or issues');
      break;
    case 'bundling':
      actions.push('Document distinct services requiring separate reimbursement');
      actions.push('Apply appropriate modifiers if applicable');
      break;
  }

  actions.push('Submit appeal with all required documentation');
  actions.push('Track appeal status and follow up regularly');

  return actions;
}

/**
 * Generate notes about the denial
 */
function generateNotes(
  carcInfo: CARCCodeInfo,
  payerId: string,
  recoveryProbability: number,
  estimatedRecovery: number
): string[] {
  const notes: string[] = [];

  notes.push(`CARC ${carcInfo.code}: ${carcInfo.description}`);
  notes.push(`Denial category: ${carcInfo.category.replace(/_/g, ' ')}`);
  notes.push(`Payer: ${payerId}`);
  notes.push(`Recovery probability: ${recoveryProbability}%`);
  notes.push(`Estimated recovery: $${estimatedRecovery.toLocaleString()}`);

  if (!carcInfo.appealable) {
    notes.push('This denial type is typically not appealable');
  }

  return notes;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Analyze a claim denial and provide appeal recommendations
 */
export function analyzeDenial(input: DenialInput): DenialAnalysisResult {
  const {
    billedAmount,
    carcCode,
    payerId,
    denialDate,
    currentAppealLevel,
    previousAppeals,
    hasDocumentation = false
  } = input;

  // Get CARC code information
  const carcInfo = getCARCInfo(carcCode);

  // Calculate appeal deadline and days remaining
  const appealDeadline = calculateAppealDeadline(denialDate, payerId);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((appealDeadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  // Determine recommended appeal level
  const recommendedAppealLevel = currentAppealLevel || determineAppealLevel(previousAppeals);

  // Calculate recovery probability
  const recoveryProbability = calculateRecoveryProbability(carcInfo, hasDocumentation, previousAppeals);

  // Estimate recovery amount
  const estimatedRecovery = Math.round(billedAmount * (recoveryProbability / 100));

  // Generate required documentation
  const requiredDocumentation = generateRequiredDocumentation(carcInfo, carcInfo.category);

  // Generate recommended actions
  const actions = generateActions(
    carcInfo.category,
    carcInfo.appealable,
    daysUntilDeadline,
    hasDocumentation,
    recoveryProbability
  );

  // Generate notes
  const notes = generateNotes(carcInfo, payerId, recoveryProbability, estimatedRecovery);

  return {
    denialCategory: carcInfo.category,
    denialDescription: carcInfo.description,
    isAppealable: carcInfo.appealable,
    recommendedAppealLevel,
    appealDeadline,
    daysUntilDeadline,
    recoveryProbability,
    estimatedRecovery,
    actions,
    requiredDocumentation,
    notes
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all known CARC codes
 */
export function getAllCARCCodes(): CARCCodeInfo[] {
  return Object.values(CARC_CODES);
}

/**
 * Get CARC codes by category
 */
export function getCARCCodesByCategory(category: DenialCategory): CARCCodeInfo[] {
  return Object.values(CARC_CODES).filter(code => code.category === category);
}

/**
 * Quick check if a denial is appealable
 */
export function isDenialAppealable(carcCode: string): boolean {
  const info = getCARCInfo(carcCode);
  return info.appealable;
}

/**
 * Calculate total recovery potential from multiple denials
 */
export function calculateBatchRecoveryPotential(denials: DenialInput[]): {
  totalBilled: number;
  totalEstimatedRecovery: number;
  averageProbability: number;
  appealableCount: number;
} {
  let totalBilled = 0;
  let totalEstimatedRecovery = 0;
  let totalProbability = 0;
  let appealableCount = 0;

  for (const denial of denials) {
    const result = analyzeDenial(denial);
    totalBilled += denial.billedAmount;
    totalEstimatedRecovery += result.estimatedRecovery;
    totalProbability += result.recoveryProbability;
    if (result.isAppealable) appealableCount++;
  }

  return {
    totalBilled,
    totalEstimatedRecovery,
    averageProbability: denials.length > 0 ? totalProbability / denials.length : 0,
    appealableCount
  };
}
