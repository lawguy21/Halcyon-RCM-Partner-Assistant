/**
 * @halcyon-rcm/core
 * Core recovery engine logic for Halcyon RCM Partner Assistant
 */

// Re-export auth module (RBAC)
export * from './auth/index.js';

// Re-export engine modules (primary source for these exports)
export * from './engines/index.js';

// Re-export collections module
export * from './collections/index.js';

// Re-export models
export * from './models/index.js';

// Re-export payer management modules
export * from './payers/index.js';

// Re-export payments module (ERA 835 processing)
export * from './payments/index.js';

// Re-export claims module (X12 837 claim submission)
export * from './claims/index.js';

// Re-export workflow rules engine
export * from './workflow/index.js';

// Re-export data modules (CPT, ICD-10, Revenue codes)
export * from './data/cpt-codes.js';
export * from './data/icd10-codes.js';
export * from './data/revenue-codes.js';

// Re-export transparency module (CMS Price Transparency)
export * from './transparency/index.js';

// Re-export predictive analytics module
export * from './analytics/index.js';

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
