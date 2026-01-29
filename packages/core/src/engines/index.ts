/**
 * Recovery Engines
 * Business logic for revenue cycle management operations
 */

export interface RecoveryEngine {
  name: string;
  version: string;
  process(data: unknown): Promise<unknown>;
}

// Placeholder for engine implementations
export const engines: RecoveryEngine[] = [];

// ============================================================================
// ORIGINAL HOSPITAL RECOVERY ENGINES
// ============================================================================

export { evaluateMedicaidRecovery } from './medicaid-recovery.js';
export { evaluateMedicareRecovery } from './medicare-recovery.js';
export { evaluateDSHRelevance } from './dsh-relevance.js';
export { evaluateStateProgram } from './state-programs.js';
export { calculateHospitalRecovery } from './recovery-calculator.js';

// ============================================================================
// MEDICARE AGE-BASED ELIGIBILITY ENGINE
// ============================================================================

export { evaluateMedicareAgeEligibility } from './medicare-age.js';
export type { MedicareAgeInput, MedicareAgeResult } from './medicare-age.js';

// ============================================================================
// MAGI CALCULATOR ENGINE
// ============================================================================

export {
  calculateMAGI,
  quickMAGICheck,
  getMonthlyIncomeLimit,
  getFPL2024Thresholds,
  calculateFPLThreshold,
  isExpansionState,
  getStateThreshold,
  calculateIncomeDisregard,
  MEDICAID_EXPANSION_STATES,
  FPL_2024,
  EXPANSION_THRESHOLD_PERCENT,
  BASE_THRESHOLD_PERCENT
} from './magi-calculator.js';
export type {
  MAGIResult,
  MAGICalculatorInput,
  MAGIIncomeInput,
  MAGIHouseholdInput,
  MAGIBreakdown,
  MAGIApplicantCategory,
  ExcludedIncomeType,
  ExcludedIncomeItem
} from './magi-calculator.js';

// ============================================================================
// PRESUMPTIVE ELIGIBILITY ENGINE
// ============================================================================

export {
  evaluatePresumptiveEligibility,
  stateHasHPEProgram,
  calculateCoverageEndDate,
  calculateApplicationDeadline,
  getPEIncomeThreshold,
  getHPEStatesByCategory,
  getHPEStateCounts,
  validatePEInput,
  HPE_STATES_CHILDREN,
  HPE_STATES_PREGNANT,
  HPE_STATES_ADULTS,
  HPE_STATES_FORMER_FOSTER_CARE,
  HPE_STATES_PARENT_CARETAKER,
  PE_FPL_THRESHOLDS,
  STATE_APPLICATION_DEADLINES
} from './presumptive-eligibility.js';
export type {
  PEPatientCategory,
  PresumptiveEligibilityInput,
  PresumptiveEligibilityResult
} from './presumptive-eligibility.js';

// ============================================================================
// RETROACTIVE COVERAGE CALCULATOR
// ============================================================================

export {
  calculateRetroactiveCoverage,
  getStatesWithNoRetroactiveCoverage,
  getStatesWithReducedRetroactiveCoverage,
  stateHasRetroactiveWaiver,
  getStateRetroactiveWindow,
  isRetroactiveCoveragePossible
} from './retroactive-coverage.js';
export type {
  RetroactiveCoverageInput,
  RetroactiveCoverageResult,
  WaiverDetails
} from './retroactive-coverage.js';

// ============================================================================
// 501(R) CHARITY CARE COMPLIANCE ENGINE
// ============================================================================

export {
  evaluateCharityCare501r,
  isECAProhibited,
  getECAAllowedDate,
  checkFAPEligibility,
  ECA_NOTIFICATION_PERIOD_DAYS,
  ECA_WRITTEN_NOTICE_DAYS,
  EXTRAORDINARY_COLLECTION_ACTIONS
} from './charity-care-501r.js';
export type {
  CharityCare501rInput,
  CharityCare501rResult,
  HospitalFAPPolicy,
  DiscountTier,
  NotificationRecord,
  NotificationType,
  FAPEligibilityStatus,
  ComplianceStatus,
  ECAStatus,
  RequiredNotification,
  ComplianceChecklistItem
} from './charity-care-501r.js';

// ============================================================================
// DSH AUDIT COMPLIANCE ENGINE
// ============================================================================

export { calculateDSHAudit } from './dsh-audit.js';
export type {
  DSHAuditInput,
  DSHAuditResult,
  WorksheetS10Data,
  DSHFacilityType
} from './dsh-audit.js';

// ============================================================================
// DENIAL MANAGEMENT ENGINE
// ============================================================================

export {
  analyzeDenial,
  getAllCARCCodes,
  getCARCCodesByCategory,
  isDenialAppealable,
  calculateBatchRecoveryPotential
} from './denial-management.js';
export type {
  DenialInput,
  DenialAnalysisResult,
  DenialCategory,
  AppealLevel,
  AppealStatus,
  AppealAttempt
} from './denial-management.js';

// ============================================================================
// DUAL-ELIGIBLE COORDINATION ENGINE
// ============================================================================

export {
  evaluateDualEligible,
  isQMBBeneficiary,
  canBalanceBill,
  getCrossoverRequirements
} from './dual-eligible.js';
export type {
  DualEligibleInput,
  DualEligibleResult,
  DualEligibleCategory,
  MedicarePartStatus,
  MedicaidStatus,
  BillingInstruction,
  SpecialProgramInfo
} from './dual-eligible.js';
