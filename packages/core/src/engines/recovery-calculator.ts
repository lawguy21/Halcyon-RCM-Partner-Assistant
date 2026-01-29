/**
 * Recovery Calculator Engine
 *
 * Main orchestrator that combines all recovery pathway engines:
 * - Medicaid Recovery (M1-M4)
 * - Medicare Recovery (MC1-MC2)
 * - DSH Relevance (DSH1-DSH3)
 * - State Programs (SP0-SP4)
 * - Medicare Age Eligibility
 * - MAGI Calculator
 * - Presumptive Eligibility
 * - Retroactive Coverage
 * - Charity Care 501(r) Compliance
 * - DSH Audit Metrics
 * - Denial Management
 * - Dual Eligible Coordination
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import {
  HospitalRecoveryResult,
  MedicaidRecoveryResult,
  MedicareRecoveryResult,
  DSHRelevanceResult,
  StateProgramResult,
  ProjectedRecovery
} from '../models/recovery-result.js';
import { evaluateMedicaidRecovery } from './medicaid-recovery.js';
import { evaluateMedicareRecovery } from './medicare-recovery.js';
import { evaluateDSHRelevance } from './dsh-relevance.js';
import { evaluateStateProgram } from './state-programs.js';

// Import new engines
import { calculateMAGI, MAGICalculatorInput, MAGIResult } from './magi-calculator.js';
import { evaluateMedicareAgeEligibility, MedicareAgeInput, MedicareAgeResult } from './medicare-age.js';
import { evaluatePresumptiveEligibility, PresumptiveEligibilityInput, PresumptiveEligibilityResult } from './presumptive-eligibility.js';
import { calculateRetroactiveCoverage, RetroactiveCoverageInput, RetroactiveCoverageResult } from './retroactive-coverage.js';
import { evaluateCharityCare501r, CharityCare501rInput, CharityCare501rResult, HospitalFAPPolicy, NotificationRecord } from './charity-care-501r.js';
import type { DSHAuditResult } from './dsh-audit.js';
import { analyzeDenial, DenialInput, DenialAnalysisResult } from './denial-management.js';
import { evaluateDualEligible, DualEligibleInput, DualEligibleResult } from './dual-eligible.js';

// ============================================================================
// EXTENDED INPUT INTERFACE
// ============================================================================

export interface ExtendedHospitalRecoveryInput extends HospitalRecoveryInput {
  // Medicare age eligibility
  dateOfBirth?: string;
  hasESRD?: boolean;
  hasALS?: boolean;
  ssdiMonthsReceived?: number;

  // MAGI calculation
  grossMonthlyIncome?: number;
  childSupportReceived?: number;
  ssiBenefits?: number;
  workersCompensation?: number;
  veteransBenefits?: number;

  // Presumptive eligibility
  isQualifiedHPEEntity?: boolean;
  patientCategory?: 'adult' | 'child' | 'pregnant' | 'formerFosterCare' | 'parentCaretaker';

  // Retroactive coverage
  applicationDate?: Date;

  // Charity care 501(r)
  hospitalFAPPolicy?: HospitalFAPPolicy;
  accountAge?: number;
  notificationsSent?: Array<{ type: string; dateSent: Date }>;
  isEmergencyService?: boolean;

  // Dual eligible
  medicarePartA?: 'enrolled' | 'not_enrolled' | 'pending' | 'terminated';
  medicarePartB?: 'enrolled' | 'not_enrolled' | 'pending' | 'terminated';
  medicarePartD?: 'enrolled' | 'not_enrolled' | 'pending' | 'terminated';
  hasMedicareAdvantage?: boolean;
  hasDSNP?: boolean;
  hasPACE?: boolean;
  medicaidScopeOfBenefits?: 'full' | 'qmb' | 'slmb' | 'qi' | 'limited';

  // Denial analysis
  denialCode?: string;
  denialReason?: string;
  denialDate?: Date;
  originalClaimAmount?: number;
  priorAppeals?: number;
}

// ============================================================================
// EXTENDED RESULT INTERFACE
// ============================================================================

export interface ExtendedHospitalRecoveryResult extends HospitalRecoveryResult {
  // New engine results
  magiResult?: MAGIResult;
  medicareAgeResult?: MedicareAgeResult;
  presumptiveEligibility?: PresumptiveEligibilityResult;
  retroactiveCoverage?: RetroactiveCoverageResult;
  charityCareCompliance?: CharityCare501rResult;
  dshAuditMetrics?: DSHAuditResult;
  denialAnalysis?: DenialAnalysisResult;
  dualEligibleStatus?: DualEligibleResult;

  // Engine tracking
  enginesLoaded: string[];
  engineErrors: string[];
}

/**
 * Calculate comprehensive hospital recovery assessment
 */
export function calculateHospitalRecovery(input: ExtendedHospitalRecoveryInput): ExtendedHospitalRecoveryResult {
  const enginesLoaded: string[] = ['medicaid-recovery', 'medicare-recovery', 'dsh-relevance', 'state-programs'];
  const engineErrors: string[] = [];

  // Run core four pathway trees
  const medicaid = evaluateMedicaidRecovery(input);
  const medicare = evaluateMedicareRecovery(input);
  const dshRelevance = evaluateDSHRelevance(input);
  const stateProgram = evaluateStateProgram(input);

  // Initialize optional results
  let magiResult: MAGIResult | undefined;
  let medicareAgeResult: MedicareAgeResult | undefined;
  let presumptiveEligibility: PresumptiveEligibilityResult | undefined;
  let retroactiveCoverage: RetroactiveCoverageResult | undefined;
  let charityCareCompliance: CharityCare501rResult | undefined;
  let dshAuditMetrics: DSHAuditResult | undefined;
  let denialAnalysis: DenialAnalysisResult | undefined;
  let dualEligibleStatus: DualEligibleResult | undefined;

  // Run MAGI Calculator if income data provided
  if (input.grossMonthlyIncome !== undefined && input.householdSize) {
    try {
      const magiInput: MAGICalculatorInput = {
        income: {
          grossIncome: input.grossMonthlyIncome * 12,
          childSupportReceived: input.childSupportReceived,
          ssiBenefits: input.ssiBenefits,
          workersCompensation: input.workersCompensation,
          veteransBenefits: input.veteransBenefits,
        },
        household: {
          householdSize: input.householdSize,
          stateCode: input.stateOfResidence,
          applicantCategory: input.patientCategory === 'parentCaretaker' ? 'parent_caretaker' :
                            input.patientCategory === 'formerFosterCare' ? 'former_foster_youth' :
                            input.patientCategory === 'pregnant' ? 'pregnant_woman' :
                            input.patientCategory === 'child' ? 'child' : 'adult',
        },
      };
      magiResult = calculateMAGI(magiInput);
      enginesLoaded.push('magi-calculator');
    } catch (e) {
      engineErrors.push(`magi-calculator: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run Medicare Age Eligibility if DOB provided
  if (input.dateOfBirth) {
    try {
      const medicareAgeInput: MedicareAgeInput = {
        dateOfBirth: new Date(input.dateOfBirth),
        dateOfService: input.dateOfService ? new Date(input.dateOfService) : new Date(),
        hasESRD: input.hasESRD,
        dialysisStartDate: undefined,
        hasALS: input.hasALS,
        ssdiStatus: input.ssdiEligibilityLikely ? 'receiving' : 'none',
        ssdiEffectiveDate: undefined,
      };
      medicareAgeResult = evaluateMedicareAgeEligibility(medicareAgeInput);
      enginesLoaded.push('medicare-age');
    } catch (e) {
      engineErrors.push(`medicare-age: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run Presumptive Eligibility if hospital is HPE entity
  if (input.isQualifiedHPEEntity !== undefined && input.patientCategory) {
    try {
      const peInput: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: input.isQualifiedHPEEntity,
        patientCategory: input.patientCategory,
        grossMonthlyIncome: input.grossMonthlyIncome || 0,
        householdSize: input.householdSize,
        stateOfResidence: input.stateOfResidence,
        applicationDate: new Date(),
      };
      presumptiveEligibility = evaluatePresumptiveEligibility(peInput);
      enginesLoaded.push('presumptive-eligibility');
    } catch (e) {
      engineErrors.push(`presumptive-eligibility: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run Retroactive Coverage if application date provided
  if (input.applicationDate && input.dateOfService) {
    try {
      const retroInput: RetroactiveCoverageInput = {
        dateOfService: new Date(input.dateOfService),
        applicationDate: input.applicationDate,
        stateOfResidence: input.stateOfResidence,
        wasEligibleOnDOS: medicaid.status === 'confirmed' || medicaid.status === 'likely',
        encounterType: input.encounterType,
        totalCharges: input.totalCharges,
      };
      retroactiveCoverage = calculateRetroactiveCoverage(retroInput);
      enginesLoaded.push('retroactive-coverage');
    } catch (e) {
      engineErrors.push(`retroactive-coverage: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run 501(r) Charity Care if FAP policy provided
  if (input.hospitalFAPPolicy && input.grossMonthlyIncome !== undefined) {
    try {
      const charityInput: CharityCare501rInput = {
        patientIncome: input.grossMonthlyIncome * 12,
        householdSize: input.householdSize,
        hospitalFAPPolicy: input.hospitalFAPPolicy,
        accountAge: input.accountAge || 0,
        notificationsSent: (input.notificationsSent || []).map(n => ({ type: n.type, date: n.dateSent } as NotificationRecord)),
        isEmergencyService: input.isEmergencyService || false,
        originalCharges: input.totalCharges,
      };
      charityCareCompliance = evaluateCharityCare501r(charityInput);
      enginesLoaded.push('charity-care-501r');
    } catch (e) {
      engineErrors.push(`charity-care-501r: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run Dual Eligible if Medicare/Medicaid status provided
  if (input.medicarePartA || input.medicarePartB) {
    try {
      const dualInput: DualEligibleInput = {
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : new Date(),
        dateOfService: input.dateOfService ? new Date(input.dateOfService) : new Date(),
        medicarePartA: input.medicarePartA || 'not_enrolled',
        medicarePartB: input.medicarePartB || 'not_enrolled',
        medicarePartD: input.medicarePartD || 'not_enrolled',
        medicaidStatus: input.medicaidStatus === 'active' ? 'active' :
                       input.medicaidStatus === 'pending' ? 'pending' : 'inactive',
        medicaidState: input.stateOfResidence,
        medicaidScopeOfBenefits: input.medicaidScopeOfBenefits,
        hasMedicareAdvantage: input.hasMedicareAdvantage ?? false,
        hasDSNP: input.hasDSNP ?? false,
        hasPACE: input.hasPACE ?? false,
        hasLIS: false,
      };
      dualEligibleStatus = evaluateDualEligible(dualInput);
      enginesLoaded.push('dual-eligible');
    } catch (e) {
      engineErrors.push(`dual-eligible: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Run Denial Analysis if denial code provided
  if (input.denialCode) {
    try {
      const denialInputData: DenialInput = {
        claimId: `CLM-${Date.now()}`,
        dateOfService: input.dateOfService ? new Date(input.dateOfService) : new Date(),
        billedAmount: input.originalClaimAmount || input.totalCharges,
        carcCode: input.denialCode,
        payerId: (input.medicareStatus === 'active_part_a' || input.medicareStatus === 'active_part_b') ? 'MEDICARE' :
                input.medicaidStatus === 'active' ? 'MEDICAID' : 'COMMERCIAL',
        denialDate: input.denialDate || new Date(),
        hasDocumentation: true,
      };
      denialAnalysis = analyzeDenial(denialInputData);
      enginesLoaded.push('denial-management');
    } catch (e) {
      engineErrors.push(`denial-management: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Calculate projected recovery amounts
  const projectedRecovery = calculateProjectedRecovery(
    input, medicaid, stateProgram, retroactiveCoverage, charityCareCompliance
  );

  // Determine primary recovery path with new engine insights
  const primaryRecoveryPath = determinePrimaryPath(
    medicaid, medicare, stateProgram, dualEligibleStatus, presumptiveEligibility, medicareAgeResult
  );

  // Generate priority actions from all engines
  const priorityActions = generatePriorityActions(
    medicaid, medicare, dshRelevance, stateProgram,
    presumptiveEligibility, retroactiveCoverage, charityCareCompliance, dualEligibleStatus, denialAnalysis
  );

  // Calculate overall confidence with new engine outputs
  const overallConfidence = calculateOverallConfidence(
    medicaid, medicare, dshRelevance, stateProgram, magiResult, presumptiveEligibility, dualEligibleStatus
  );

  return {
    primaryRecoveryPath,
    overallConfidence,
    estimatedTotalRecovery: projectedRecovery.total,
    priorityActions,

    medicaid,
    medicare,
    dshRelevance,
    stateProgram,

    // New engine results
    magiResult,
    medicareAgeResult,
    presumptiveEligibility,
    retroactiveCoverage,
    charityCareCompliance,
    dshAuditMetrics,
    denialAnalysis,
    dualEligibleStatus,

    currentExposure: input.totalCharges,
    projectedRecovery,

    immediateActions: priorityActions.slice(0, 3),
    followUpActions: priorityActions.slice(3),
    documentationNeeded: generateDocumentationList(input, medicaid, stateProgram, retroactiveCoverage),

    enginesLoaded,
    engineErrors
  };
}

/**
 * Calculate projected recovery amounts based on pathway evaluations
 */
function calculateProjectedRecovery(
  input: ExtendedHospitalRecoveryInput,
  medicaid: MedicaidRecoveryResult,
  stateProgram: StateProgramResult,
  retroactiveCoverage?: RetroactiveCoverageResult,
  charityCareCompliance?: CharityCare501rResult
): ProjectedRecovery {
  const charges = input.totalCharges;

  // Medicaid recovery estimate
  let medicaidRecovery = 0;
  if (medicaid.status === 'confirmed') {
    medicaidRecovery = medicaid.estimatedRecovery;
  } else if (medicaid.status === 'likely') {
    medicaidRecovery = medicaid.estimatedRecovery * 0.7;
  } else if (medicaid.status === 'possible') {
    medicaidRecovery = medicaid.estimatedRecovery * 0.3;
  }

  // Boost if retroactive coverage applies
  if (retroactiveCoverage?.isWithinWindow && retroactiveCoverage.estimatedRecovery > 0) {
    medicaidRecovery = Math.max(medicaidRecovery, retroactiveCoverage.estimatedRecovery);
  }

  // State program recovery (only if Medicaid not primary)
  let stateProgramRecovery = 0;
  if (medicaid.status !== 'confirmed' && stateProgram.eligibilityLikely) {
    stateProgramRecovery = charges * (stateProgram.estimatedRecoveryPercent / 100) * (stateProgram.confidence / 100);
  }

  // Charity write-off value
  let charityWriteoff = Math.max(0, charges - medicaidRecovery - stateProgramRecovery);
  if (charityCareCompliance?.discountPercentage && charityCareCompliance.discountPercentage > 0) {
    charityWriteoff = charges * (charityCareCompliance.discountPercentage / 100);
  }

  return {
    medicaid: Math.round(medicaidRecovery),
    stateProgram: Math.round(stateProgramRecovery),
    charityWriteoff: Math.round(charityWriteoff * 0.1),
    total: Math.round(medicaidRecovery + stateProgramRecovery)
  };
}

/**
 * Determine the primary recovery path based on pathway evaluations
 */
function determinePrimaryPath(
  medicaid: MedicaidRecoveryResult,
  medicare: MedicareRecoveryResult,
  stateProgram: StateProgramResult,
  dualEligible?: DualEligibleResult,
  presumptive?: PresumptiveEligibilityResult,
  medicareAge?: MedicareAgeResult
): string {
  // Check for dual eligible first
  if (dualEligible?.isDualEligible) {
    return `Dual Eligible Coordination (${dualEligible.dualCategory})`;
  }

  if (medicaid.status === 'confirmed') return 'Medicaid Direct Billing';
  if (medicare.status === 'active_on_dos') return 'Medicare Direct Billing';

  // Check presumptive eligibility
  if (presumptive?.canGrantPE) {
    return `Presumptive Eligibility`;
  }

  if (medicaid.status === 'likely') return 'Medicaid Application/Retroactive';

  // Check Medicare age eligibility
  if (medicareAge?.isEligible) {
    return 'Medicare Eligibility (Age-Based)';
  }

  if (stateProgram.eligibilityLikely) return `State Program: ${stateProgram.programName}`;
  if (medicaid.status === 'possible') return 'Medicaid Exploration';
  return 'Financial Assistance Screening';
}

/**
 * Generate prioritized list of actions across all pathways
 */
function generatePriorityActions(
  medicaid: MedicaidRecoveryResult,
  medicare: MedicareRecoveryResult,
  dsh: DSHRelevanceResult,
  stateProgram: StateProgramResult,
  presumptive?: PresumptiveEligibilityResult,
  retroactive?: RetroactiveCoverageResult,
  charityCare?: CharityCare501rResult,
  dualEligible?: DualEligibleResult,
  denialAnalysis?: DenialAnalysisResult
): string[] {
  const actions: string[] = [];

  // Dual eligible actions are highest priority
  if (dualEligible?.isDualEligible) {
    actions.push(...dualEligible.billingInstructions.slice(0, 2).map(i => i.instruction));
  }

  // Denial appeal actions
  if (denialAnalysis?.isAppealable) {
    actions.push(...denialAnalysis.actions.slice(0, 2));
  }

  // Presumptive eligibility - time-sensitive
  if (presumptive?.canGrantPE) {
    actions.push(...presumptive.requiredActions.slice(0, 2));
  }

  // Prioritize by recovery likelihood
  if (medicaid.status === 'confirmed' || medicaid.status === 'likely') {
    actions.push(...medicaid.actions.slice(0, 2));
  }

  if (medicare.status === 'active_on_dos') {
    actions.push(...medicare.actions.slice(0, 1));
  }

  // Retroactive coverage actions
  if (retroactive?.isWithinWindow) {
    actions.push(`Submit Medicaid application for retroactive coverage (window: ${retroactive.retroactiveWindowDays} days)`);
  }

  if (stateProgram.eligibilityLikely) {
    actions.push(...stateProgram.actions.slice(0, 2));
  }

  // Charity care compliance issues
  if (charityCare && charityCare.complianceStatus !== 'compliant') {
    actions.push(...charityCare.actions.slice(0, 1));
  }

  // Always include DSH documentation if relevant
  if (dsh.relevance === 'high') {
    actions.push('Document encounter for DSH reporting requirements');
  }

  // Deduplicate and return
  return [...new Set(actions)];
}

/**
 * Calculate overall confidence factoring in all engine outputs
 */
function calculateOverallConfidence(
  medicaid: MedicaidRecoveryResult,
  medicare: MedicareRecoveryResult,
  dsh: DSHRelevanceResult,
  stateProgram: StateProgramResult,
  magi?: MAGIResult,
  presumptive?: PresumptiveEligibilityResult,
  dualEligible?: DualEligibleResult
): number {
  let overallConfidence: number;

  if (medicaid.status === 'confirmed' && medicaid.confidence >= 90) {
    overallConfidence = Math.round(
      (medicaid.confidence * 0.7) +
      (dsh.score * 0.2) +
      (medicare.confidence * 0.1)
    );
  } else {
    overallConfidence = Math.round(
      (medicaid.confidence * 0.4) +
      (stateProgram.confidence * 0.3) +
      (dsh.score * 0.2) +
      (medicare.confidence * 0.1)
    );
  }

  // Boost confidence if MAGI confirms eligibility
  if (magi?.isIncomeEligible) {
    overallConfidence = Math.min(100, overallConfidence + 10);
  }

  // Boost for presumptive eligibility
  if (presumptive?.canGrantPE && presumptive.confidence > 70) {
    overallConfidence = Math.min(100, overallConfidence + 5);
  }

  // Dual eligible patients have clearer pathways
  if (dualEligible?.isDualEligible) {
    overallConfidence = Math.min(100, overallConfidence + 8);
  }

  return overallConfidence;
}

/**
 * Generate comprehensive documentation list for recovery pathways
 */
function generateDocumentationList(
  input: ExtendedHospitalRecoveryInput,
  medicaid: MedicaidRecoveryResult,
  stateProgram: StateProgramResult,
  retroactive?: RetroactiveCoverageResult
): string[] {
  const docs: string[] = [];

  docs.push('Patient identification');
  docs.push('Date of service documentation');
  docs.push('Service/encounter records');

  if (medicaid.status !== 'unlikely' || stateProgram.eligibilityLikely) {
    docs.push('Income verification (pay stubs, tax return, benefit statements)');
    docs.push('Household composition documentation');
  }

  docs.push('Insurance status verification as of date of service');

  if (retroactive?.isWithinWindow) {
    docs.push('Proof of eligibility during retroactive period');
  }

  if (stateProgram.requiredDocuments.length > 0) {
    docs.push(...stateProgram.requiredDocuments);
  }

  if (input.ssiEligibilityLikely || input.ssdiEligibilityLikely) {
    docs.push('Medical records supporting disability');
    docs.push('Physician statement on functional limitations');
  }

  if (input.dateOfBirth) {
    docs.push('Birth certificate or proof of age');
  }

  return [...new Set(docs)];
}
