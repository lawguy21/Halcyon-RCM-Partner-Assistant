/**
 * Claims Module
 * X12 837 healthcare claims submission engine
 */

// Types
export * from './claim-types.js';

// Validator
export {
  validateNPI,
  validateProviderNPI,
  validateDiagnosis,
  validateProcedures,
  validateModifiers,
  validateTimeliness,
  validateClaimData,
  validateICD10CMFormat,
  validateICD10PCSFormat,
  validateProcedureCodeFormat,
} from './claim-validator.js';
export type { ValidationResult } from './claim-validator.js';

// X12 837 Formatter
export {
  X12837Formatter,
  formatProfessionalClaim,
  formatInstitutionalClaim,
  generateInterchangeControlNumber,
  generateGroupControlNumber,
  generateTransactionSetControlNumber,
  createDefaultInterchangeInfo,
  createDefaultFunctionalGroupInfo,
} from './x12-837-formatter.js';
export type { FormatterOptions } from './x12-837-formatter.js';
