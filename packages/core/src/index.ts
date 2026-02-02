/**
 * @halcyon-rcm/core
 * Core recovery engine logic for Halcyon RCM Partner Assistant
 *
 * Note: Some modules have duplicate type definitions. To avoid export conflicts,
 * consumers should import directly from submodules when needed:
 * - import { ClaimStatus } from '@halcyon-rcm/core/claims'
 * - import { PatientInfo } from '@halcyon-rcm/core/payments'
 */

// Re-export auth module (RBAC)
export * from './auth/index.js';

// Re-export engine modules (primary source for recovery engines)
// Note: DenialCategory is also in analytics - use engines version as primary
export * from './engines/index.js';

// Re-export collections module
export * from './collections/index.js';

// Re-export models (excluding ClaimStatus which conflicts with claims module)
export {
  RecoveryPathway,
  DisabilityLikelihood,
  PrimaryCoverage,
  MedicaidEligibilityCategory,
  InsuranceStatus,
  EncounterType,
} from './models/index.js';
export type {
  PatientAccount,
  AssessmentResult,
  RecoveryPathwayResult,
  MedicaidAssessment,
  MedicareAssessment,
  DSHAssessment,
  StateProgramAssessment,
} from './models/index.js';

// Re-export payer management modules (excluding ServiceCategory which may conflict)
export * from './payers/index.js';

// Re-export payments module (ERA 835 processing)
// Note: PatientInfo, ProviderInfo defined here - don't also export from claims
export * from './payments/index.js';

// Re-export claims module selectively to avoid conflicts
// ClaimStatus interface conflicts with models ClaimStatus type
export {
  generateX12837P,
  generateX12837I,
  X12837Generator,
  validateClaim,
  ClaimValidator,
} from './claims/index.js';
export type {
  X12837Claim,
  X12837ServiceLine,
  X12837Provider,
  X12837Subscriber,
  ClaimDiagnosis,
  ClaimValidationResult,
  ClaimValidationError,
  ClaimValidationWarning,
} from './claims/index.js';

// Re-export workflow rules engine
export * from './workflow/index.js';

// Re-export data modules (CPT, ICD-10, Revenue codes)
export * from './data/cpt-codes.js';
export * from './data/icd10-codes.js';
export * from './data/revenue-codes.js';

// Re-export transparency module selectively (PatientInfo conflicts)
export {
  PriceEstimator,
  MachineReadableFileGenerator,
} from './transparency/index.js';
export type {
  PriceEstimate,
  ServiceEstimate,
  InsuranceInfo,
  MachineReadableFile,
  StandardCharge,
  PayerSpecificCharge,
} from './transparency/index.js';

// Re-export predictive analytics module selectively (DenialCategory, DateRange may conflict)
export {
  DenialPredictor,
  CollectionPredictor,
  RevenueForecaster,
  KPICalculator,
} from './analytics/index.js';
export type {
  DenialPrediction,
  CollectionPrediction,
  RevenueForecast,
  KPIMetrics,
  KPITrend,
} from './analytics/index.js';

// Re-export staff productivity tracking module
export * from './productivity/index.js';

// Re-export config selectively to avoid duplicates with engines
// Core configuration
export { defaultConfig, mergeConfig } from './config/index.js';
export type { CoreConfig } from './config/index.js';

// State programs configuration
export { STATE_PROGRAM_MAP } from './config/state-programs.js';
export type { StateProgramMapping } from './config/state-programs.js';

// Income thresholds (re-export only unique items not in engines)
export {
  NON_EXPANSION_STATES,
  INCOME_LEVEL_ORDER,
  FPL_2024_ANNUAL,
  FPL_2024_ADDITIONAL_PERSON,
  getFPLThreshold,
  getFPLPercentageThreshold,
  isMedicaidExpansionState,
  getMedicaidIncomeLimit,
  isIncomeBelowThreshold,
  parseFPLString,
  SSI_FBR_2024_MONTHLY,
  SSI_RESOURCE_LIMIT_INDIVIDUAL,
  SSI_RESOURCE_LIMIT_COUPLE,
  SGA_LIMIT_2024_MONTHLY,
  SGA_LIMIT_BLIND_2024_MONTHLY,
} from './config/income-thresholds.js';
export type { IncomeLevel } from './config/income-thresholds.js';

// State Medicaid configuration (unique exports only - isExpansionState is in engines/magi-calculator)
export {
  STATE_MEDICAID_CONFIGS,
  getStateConfig,
  getRetroactiveWindow,
  hasPresumptiveEligibility,
  getIncomeThreshold,
  getAllExpansionStates,
  getAllNonExpansionStates,
  getStatesWithNoRetroactive,
  getStatesWith1115Waiver,
} from './config/state-medicaid-config.js';
export type { StateMedicaidConfig } from './config/state-medicaid-config.js';

// Denial codes (re-export unique items - databases and types only)
export {
  CARC_GROUPS,
  CARC_CODES,
  RARC_CODES,
  getCARCCode,
  getRARCCode,
  getAppealableCARCCodes,
  getHighUrgencyCARCCodes,
  getAllRARCCodes,
  getResolutionActions,
  categorizedenial,
} from './config/denial-codes.js';
export type { CARCCode, RARCCode, CARCCategory, CARCGroup, CARCGroupInfo } from './config/denial-codes.js';

// Version
export const VERSION = '1.0.0';
