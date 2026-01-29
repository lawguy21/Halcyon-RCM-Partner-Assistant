/**
 * Payer Contract Management Module
 *
 * Comprehensive payer management including:
 * - Payer database with 50+ major payers
 * - Fee schedule management
 * - Contract terms and reimbursement calculation
 * - Authorization requirement tracking
 * - Filing deadline management
 */

// Payer Database
export {
  // Types
  type PayerType,
  type PayerSubType,
  type PayerRequirements,
  type Payer,
  // Database
  PAYER_DATABASE,
  // Functions
  getPayer,
  getPayerByElectronicId,
  searchPayers,
  getPayersByType,
  getPayersBySubType,
  getPayersByState,
  getMedicarePayers,
  getMedicaidPayers,
  getBCBSPayers,
  getActivePayers,
  getAllPayers,
  getTimelyFilingDays,
  getAppealDeadlineDays,
  requiresPriorAuth,
  getPayerCountByType
} from './payer-database.js';

// Fee Schedule
export {
  // Types
  type FeeScheduleEntry,
  type ClaimCharge,
  type ExpectedPaymentResult,
  type ExpectedPaymentLineItem,
  type MedicareBenchmark,
  type FeeScheduleImportResult,
  type FeeScheduleImportError,
  type FeeScheduleCSVRow,
  // Functions
  addFeeScheduleEntry,
  lookupFee,
  getMedicareAllowedAmount,
  calculateExpectedPayment,
  compareToMedicare,
  calculateAveragePercentOfMedicare,
  importFeeSchedule,
  getFeeScheduleForPayer,
  clearFeeSchedule,
  getFeeScheduleStats,
  exportFeeSchedule
} from './fee-schedule.js';

// Contract Terms
export {
  // Types
  type ReimbursementType,
  type ContractStatus,
  type ServiceCategory,
  type ContractTerms,
  type CarveOut,
  type ServiceReimbursementOverride,
  type AuthRequirement,
  type ReimbursementCalculationResult,
  type ReimbursementLineItem,
  type TimelyFilingDeadline,
  type AppealDeadline,
  // Functions
  setContractTerms,
  getContractTerms,
  getAllContractsForPayer,
  calculateReimbursement,
  setAuthRequirement,
  checkAuthRequirement,
  getAuthRequirementsForPayer,
  batchCheckAuthRequirements,
  getTimelyFilingDeadline,
  getAppealDeadline,
  batchCalculateDeadlines,
  getClaimsApproachingDeadline,
  getClaimsPastDeadline,
  isContractActive,
  getDaysUntilContractExpiration,
  clearContractTerms,
  clearAuthRequirements,
  getContractSummary
} from './contract-terms.js';
