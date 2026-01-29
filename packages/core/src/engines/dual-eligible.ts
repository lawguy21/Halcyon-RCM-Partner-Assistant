/**
 * Dual-Eligible Coordination Engine
 *
 * Manages coordination of benefits for patients eligible for both
 * Medicare and Medicaid (dual-eligible beneficiaries).
 *
 * Key features:
 * - Dual-eligible status determination
 * - Benefit coordination logic
 * - Crossover claim tracking
 * - D-SNP and PACE program identification
 */

// ============================================================================
// TYPES
// ============================================================================

export type DualEligibleCategory =
  | 'full_dual'           // Full Medicaid benefits
  | 'qmb_only'            // Qualified Medicare Beneficiary - Medicaid pays Medicare premiums/cost-sharing only
  | 'slmb_only'           // Specified Low-Income Medicare Beneficiary - Medicaid pays Part B premium only
  | 'qi'                  // Qualifying Individual - Medicaid pays Part B premium only
  | 'qdwi'                // Qualified Disabled Working Individual
  | 'partial_dual'        // Some Medicaid benefits
  | 'not_dual';           // Not dual-eligible

export type MedicarePartStatus = 'enrolled' | 'not_enrolled' | 'pending' | 'terminated';

export type MedicaidStatus = 'active' | 'inactive' | 'pending' | 'spend_down';

// ============================================================================
// INPUT INTERFACES
// ============================================================================

export interface DualEligibleInput {
  /** Patient date of birth */
  dateOfBirth: Date;
  /** Date of service */
  dateOfService: Date;
  /** Medicare Part A status */
  medicarePartA: MedicarePartStatus;
  /** Medicare Part B status */
  medicarePartB: MedicarePartStatus;
  /** Medicare Part D status (prescription drug) */
  medicarePartD: MedicarePartStatus;
  /** Whether enrolled in Medicare Advantage */
  hasMedicareAdvantage: boolean;
  /** Medicaid eligibility status */
  medicaidStatus: MedicaidStatus;
  /** State of Medicaid coverage */
  medicaidState: string;
  /** Medicaid scope of benefits */
  medicaidScopeOfBenefits?: 'full' | 'limited' | 'qmb' | 'slmb' | 'qi';
  /** Whether enrolled in D-SNP (Dual-Eligible Special Needs Plan) */
  hasDSNP: boolean;
  /** Whether enrolled in PACE (Program of All-Inclusive Care for the Elderly) */
  hasPACE: boolean;
  /** Monthly income for benefit determination */
  monthlyIncome?: number;
  /** Asset level for benefit determination */
  assetLevel?: number;
  /** Whether patient has LIS (Low-Income Subsidy / Extra Help) */
  hasLIS: boolean;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

export interface DualEligibleResult {
  /** Dual-eligible category determination */
  dualCategory: DualEligibleCategory;
  /** Whether patient is dual-eligible */
  isDualEligible: boolean;
  /** Primary payer for services */
  primaryPayer: 'medicare' | 'medicaid' | 'medicare_advantage' | 'pace';
  /** Secondary payer for services */
  secondaryPayer?: 'medicaid' | 'none';
  /** Whether Medicaid covers Medicare cost-sharing */
  medicaidCoversCostSharing: boolean;
  /** Whether Medicaid covers Medicare premiums */
  medicaidCoversPremiums: boolean;
  /** Benefits covered by Medicare */
  medicareCoveredBenefits: string[];
  /** Benefits covered by Medicaid */
  medicaidCoveredBenefits: string[];
  /** Billing instructions */
  billingInstructions: BillingInstruction[];
  /** Recommended actions */
  actions: string[];
  /** Notes about dual-eligible status */
  notes: string[];
  /** Special program enrollment */
  specialPrograms: SpecialProgramInfo[];
}

export interface BillingInstruction {
  /** Step number in billing sequence */
  step: number;
  /** Description of the billing action */
  instruction: string;
  /** Payer to bill */
  payer: string;
  /** Expected outcome */
  expectedOutcome: string;
}

export interface SpecialProgramInfo {
  /** Program name */
  program: string;
  /** Whether enrolled */
  enrolled: boolean;
  /** Description of program benefits */
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Medicare covered benefits
 */
const MEDICARE_PART_A_BENEFITS = [
  'Inpatient hospital care',
  'Skilled nursing facility (limited)',
  'Home health care',
  'Hospice care'
];

const MEDICARE_PART_B_BENEFITS = [
  'Physician services',
  'Outpatient hospital care',
  'Preventive services',
  'Durable medical equipment',
  'Ambulance services',
  'Mental health services'
];

const MEDICARE_PART_D_BENEFITS = [
  'Prescription drugs'
];

/**
 * Medicaid benefits (varies by state)
 */
const MEDICAID_BENEFITS = [
  'Nursing facility care (long-term)',
  'Personal care services',
  'Home and community-based services',
  'Transportation',
  'Dental services',
  'Vision services',
  'Hearing aids',
  'Medicare cost-sharing'
];

/**
 * 2024 Income thresholds for dual-eligible categories
 */
const DUAL_INCOME_THRESHOLDS = {
  qmb: { single: 1275, married: 1724 },  // 100% FPL
  slmb: { single: 1529, married: 2069 }, // 120% FPL
  qi: { single: 1715, married: 2320 },   // 135% FPL
  full_dual: { single: 1732, married: 2351 } // ~138% FPL (varies by state)
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine dual-eligible category based on benefits and income
 */
function determineDualCategory(input: DualEligibleInput): DualEligibleCategory {
  // Not dual if no active Medicaid
  if (input.medicaidStatus !== 'active' && input.medicaidStatus !== 'spend_down') {
    return 'not_dual';
  }

  // Not dual if no Medicare
  if (input.medicarePartA !== 'enrolled' && input.medicarePartB !== 'enrolled') {
    return 'not_dual';
  }

  // Check explicit scope of benefits
  if (input.medicaidScopeOfBenefits) {
    switch (input.medicaidScopeOfBenefits) {
      case 'full':
        return 'full_dual';
      case 'qmb':
        return 'qmb_only';
      case 'slmb':
        return 'slmb_only';
      case 'qi':
        return 'qi';
      case 'limited':
        return 'partial_dual';
    }
  }

  // Use income to estimate if scope not provided
  if (input.monthlyIncome !== undefined) {
    const threshold = DUAL_INCOME_THRESHOLDS;
    // Assume single for simplicity if marital status not provided
    if (input.monthlyIncome <= threshold.qmb.single) {
      return 'full_dual';
    } else if (input.monthlyIncome <= threshold.slmb.single) {
      return 'slmb_only';
    } else if (input.monthlyIncome <= threshold.qi.single) {
      return 'qi';
    }
  }

  // Default to partial dual if we can't determine
  return 'partial_dual';
}

/**
 * Determine primary payer
 */
function determinePrimaryPayer(input: DualEligibleInput): 'medicare' | 'medicaid' | 'medicare_advantage' | 'pace' {
  if (input.hasPACE) {
    return 'pace';
  }
  if (input.hasMedicareAdvantage || input.hasDSNP) {
    return 'medicare_advantage';
  }
  if (input.medicarePartA === 'enrolled' || input.medicarePartB === 'enrolled') {
    return 'medicare';
  }
  return 'medicaid';
}

/**
 * Determine if Medicaid covers cost-sharing
 */
function doesMedicaidCoverCostSharing(category: DualEligibleCategory): boolean {
  return category === 'full_dual' || category === 'qmb_only';
}

/**
 * Determine if Medicaid covers premiums
 */
function doesMedicaidCoverPremiums(category: DualEligibleCategory): boolean {
  return ['full_dual', 'qmb_only', 'slmb_only', 'qi'].includes(category);
}

/**
 * Generate Medicare covered benefits
 */
function generateMedicareBenefits(input: DualEligibleInput): string[] {
  const benefits: string[] = [];

  if (input.medicarePartA === 'enrolled') {
    benefits.push(...MEDICARE_PART_A_BENEFITS);
  }
  if (input.medicarePartB === 'enrolled') {
    benefits.push(...MEDICARE_PART_B_BENEFITS);
  }
  if (input.medicarePartD === 'enrolled') {
    benefits.push(...MEDICARE_PART_D_BENEFITS);
  }

  return benefits;
}

/**
 * Generate Medicaid covered benefits
 */
function generateMedicaidBenefits(category: DualEligibleCategory): string[] {
  switch (category) {
    case 'full_dual':
      return MEDICAID_BENEFITS;
    case 'qmb_only':
      return ['Medicare Part A premium', 'Medicare Part B premium', 'Medicare deductibles', 'Medicare coinsurance'];
    case 'slmb_only':
      return ['Medicare Part B premium'];
    case 'qi':
      return ['Medicare Part B premium'];
    case 'partial_dual':
      return ['Limited Medicaid benefits (varies by state)'];
    default:
      return [];
  }
}

/**
 * Generate billing instructions
 */
function generateBillingInstructions(
  primaryPayer: string,
  category: DualEligibleCategory,
  hasMedicareAdvantage: boolean
): BillingInstruction[] {
  const instructions: BillingInstruction[] = [];

  if (primaryPayer === 'pace') {
    instructions.push({
      step: 1,
      instruction: 'Bill PACE program for all services',
      payer: 'PACE',
      expectedOutcome: 'PACE covers all Medicare and Medicaid benefits'
    });
    return instructions;
  }

  if (hasMedicareAdvantage) {
    instructions.push({
      step: 1,
      instruction: 'Bill Medicare Advantage plan as primary',
      payer: 'Medicare Advantage',
      expectedOutcome: 'MA plan pays according to plan benefits'
    });
  } else {
    instructions.push({
      step: 1,
      instruction: 'Bill Medicare as primary payer',
      payer: 'Medicare',
      expectedOutcome: 'Medicare pays 80% for Part B, varies for Part A'
    });
  }

  if (category === 'full_dual' || category === 'qmb_only') {
    instructions.push({
      step: 2,
      instruction: 'Submit crossover claim to Medicaid for cost-sharing',
      payer: 'Medicaid',
      expectedOutcome: 'Medicaid pays remaining deductible/coinsurance'
    });
    instructions.push({
      step: 3,
      instruction: 'Do NOT bill patient for Medicare cost-sharing',
      payer: 'None',
      expectedOutcome: 'QMB patients cannot be balance billed'
    });
  } else if (category === 'partial_dual') {
    instructions.push({
      step: 2,
      instruction: 'Bill Medicaid for Medicaid-only covered services',
      payer: 'Medicaid',
      expectedOutcome: 'Medicaid pays for services not covered by Medicare'
    });
  }

  return instructions;
}

/**
 * Generate special program information
 */
function generateSpecialProgramInfo(input: DualEligibleInput): SpecialProgramInfo[] {
  const programs: SpecialProgramInfo[] = [];

  programs.push({
    program: 'D-SNP (Dual-Eligible Special Needs Plan)',
    enrolled: input.hasDSNP,
    description: input.hasDSNP
      ? 'Enrolled in D-SNP - coordinates Medicare and Medicaid benefits'
      : 'Not enrolled - may benefit from D-SNP enrollment'
  });

  programs.push({
    program: 'PACE (Program of All-Inclusive Care for the Elderly)',
    enrolled: input.hasPACE,
    description: input.hasPACE
      ? 'Enrolled in PACE - all care coordinated through PACE program'
      : 'Not enrolled - may be eligible if age 55+ and nursing home eligible'
  });

  programs.push({
    program: 'LIS/Extra Help',
    enrolled: input.hasLIS,
    description: input.hasLIS
      ? 'Has Low-Income Subsidy - reduced Part D costs'
      : 'Not enrolled - may be eligible for Part D premium and copay assistance'
  });

  return programs;
}

/**
 * Generate recommended actions
 */
function generateActions(
  input: DualEligibleInput,
  category: DualEligibleCategory
): string[] {
  const actions: string[] = [];

  if (category === 'not_dual') {
    actions.push('Patient is not dual-eligible - bill single payer');
    if (input.medicaidStatus === 'pending') {
      actions.push('Monitor Medicaid application status');
    }
    return actions;
  }

  // Dual-eligible actions
  actions.push('Verify dual-eligible status with both Medicare and Medicaid');
  actions.push('Ensure proper billing sequence (Medicare first, Medicaid second)');

  if (category === 'qmb_only' || category === 'full_dual') {
    actions.push('Do NOT balance bill patient for Medicare cost-sharing');
    actions.push('Submit crossover claims for cost-sharing recovery');
  }

  if (!input.hasDSNP && !input.hasPACE) {
    actions.push('Consider D-SNP enrollment counseling for care coordination');
  }

  if (!input.hasLIS && input.medicarePartD === 'enrolled') {
    actions.push('Screen for Low-Income Subsidy (Extra Help) eligibility');
  }

  if (input.hasPACE) {
    actions.push('Coordinate all care through PACE program');
    actions.push('Contact PACE for service authorization');
  }

  if (input.medicaidStatus === 'spend_down') {
    actions.push('Track patient spend-down status for Medicaid activation');
    actions.push('Assist with documentation of medical expenses for spend-down');
  }

  return actions;
}

/**
 * Generate notes about dual-eligible status
 */
function generateNotes(
  input: DualEligibleInput,
  category: DualEligibleCategory
): string[] {
  const notes: string[] = [];

  const categoryDescriptions: Record<DualEligibleCategory, string> = {
    full_dual: 'Full dual-eligible - has complete Medicare and Medicaid benefits',
    qmb_only: 'QMB Only - Medicaid pays Medicare premiums and cost-sharing',
    slmb_only: 'SLMB Only - Medicaid pays Medicare Part B premium only',
    qi: 'QI - Medicaid pays Medicare Part B premium only',
    qdwi: 'QDWI - Medicaid pays Medicare Part A premium for disabled workers',
    partial_dual: 'Partial dual-eligible - limited Medicaid benefits',
    not_dual: 'Not dual-eligible'
  };

  notes.push(`Dual-eligible category: ${categoryDescriptions[category]}`);
  notes.push(`Medicaid state: ${input.medicaidState}`);

  if (input.hasMedicareAdvantage) {
    notes.push('Enrolled in Medicare Advantage - bill MA plan as primary');
  }

  if (category === 'qmb_only' || category === 'full_dual') {
    notes.push('IMPORTANT: Federal law prohibits balance billing QMB beneficiaries');
    notes.push('Medicaid is payer of last resort for cost-sharing');
  }

  if (input.hasPACE) {
    notes.push('PACE enrollment - program covers all Medicare and Medicaid services');
    notes.push('All care must be coordinated through PACE interdisciplinary team');
  }

  if (input.hasDSNP) {
    notes.push('D-SNP enrollment provides integrated Medicare/Medicaid benefits');
  }

  return notes;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Evaluate dual-eligible status and generate coordination recommendations
 */
export function evaluateDualEligible(input: DualEligibleInput): DualEligibleResult {
  // Determine dual-eligible category
  const dualCategory = determineDualCategory(input);
  const isDualEligible = dualCategory !== 'not_dual';

  // Determine payers
  const primaryPayer = determinePrimaryPayer(input);
  const secondaryPayer: 'medicaid' | 'none' = isDualEligible ? 'medicaid' : 'none';

  // Determine coverage scope
  const medicaidCoversCostSharing = doesMedicaidCoverCostSharing(dualCategory);
  const medicaidCoversPremiums = doesMedicaidCoverPremiums(dualCategory);

  // Generate benefit lists
  const medicareCoveredBenefits = generateMedicareBenefits(input);
  const medicaidCoveredBenefits = generateMedicaidBenefits(dualCategory);

  // Generate billing instructions
  const billingInstructions = generateBillingInstructions(
    primaryPayer,
    dualCategory,
    input.hasMedicareAdvantage
  );

  // Generate actions and notes
  const actions = generateActions(input, dualCategory);
  const notes = generateNotes(input, dualCategory);

  // Generate special program info
  const specialPrograms = generateSpecialProgramInfo(input);

  return {
    dualCategory,
    isDualEligible,
    primaryPayer,
    secondaryPayer: isDualEligible ? secondaryPayer : undefined,
    medicaidCoversCostSharing,
    medicaidCoversPremiums,
    medicareCoveredBenefits,
    medicaidCoveredBenefits,
    billingInstructions,
    actions,
    notes,
    specialPrograms
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick check for QMB status (balance billing protection)
 */
export function isQMBBeneficiary(input: DualEligibleInput): boolean {
  const category = determineDualCategory(input);
  return category === 'qmb_only' || category === 'full_dual';
}

/**
 * Check if patient can be balance billed
 */
export function canBalanceBill(input: DualEligibleInput): boolean {
  return !isQMBBeneficiary(input);
}

/**
 * Get crossover claim requirements
 */
export function getCrossoverRequirements(input: DualEligibleInput): {
  required: boolean;
  automatic: boolean;
  medicaidId?: string;
} {
  const category = determineDualCategory(input);
  const requiresCrossover = ['full_dual', 'qmb_only', 'partial_dual'].includes(category);

  return {
    required: requiresCrossover,
    automatic: input.hasDSNP || input.hasMedicareAdvantage, // Often automatic with managed care
    medicaidId: undefined // Would come from patient record
  };
}
