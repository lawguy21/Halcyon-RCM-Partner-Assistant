/**
 * X12 837 Claim Validator
 * Validates healthcare claims data before submission
 */

import type {
  ProfessionalClaim,
  InstitutionalClaim,
  ClaimValidationResult,
  ClaimError,
  ClaimWarning,
  DiagnosisInfo,
  ProcedureInfo,
  RevenueCodeLine,
  ProviderInfo,
  PatientInfo,
  SubscriberInfo,
  PayerInfo,
  ClaimHeader,
} from './claim-types.js';

// ============================================================================
// VALIDATION RESULT INTERFACE
// ============================================================================

export interface ValidationResult extends ClaimValidationResult {
  isValid: boolean;
  errors: ClaimError[];
  warnings: ClaimWarning[];
}

// ============================================================================
// NPI VALIDATION
// ============================================================================

/**
 * Validates a National Provider Identifier (NPI) using the Luhn algorithm
 * @param npi - 10-digit NPI number
 * @returns true if valid, false otherwise
 */
export function validateNPI(npi: string): boolean {
  if (!npi || typeof npi !== 'string') {
    return false;
  }

  // Remove any spaces or dashes
  const cleanNPI = npi.replace(/[\s-]/g, '');

  // NPI must be exactly 10 digits
  if (!/^\d{10}$/.test(cleanNPI)) {
    return false;
  }

  // NPI must start with 1 or 2 (healthcare provider)
  if (!['1', '2'].includes(cleanNPI[0])) {
    return false;
  }

  // Apply Luhn algorithm with NPI prefix
  // For NPI validation, we prepend "80840" to the NPI
  const prefixedNPI = '80840' + cleanNPI;

  let sum = 0;
  let alternate = false;

  for (let i = prefixedNPI.length - 1; i >= 0; i--) {
    let digit = parseInt(prefixedNPI[i], 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Validates provider NPI and returns detailed result
 */
export function validateProviderNPI(
  provider: ProviderInfo | undefined,
  fieldPrefix: string = 'provider'
): { isValid: boolean; errors: ClaimError[] } {
  const errors: ClaimError[] = [];

  if (!provider) {
    errors.push({
      code: 'MISSING_PROVIDER',
      message: `${fieldPrefix} information is required`,
      field: fieldPrefix,
      severity: 'error',
    });
    return { isValid: false, errors };
  }

  if (!provider.npi) {
    errors.push({
      code: 'MISSING_NPI',
      message: `${fieldPrefix} NPI is required`,
      field: `${fieldPrefix}.npi`,
      severity: 'error',
    });
  } else if (!validateNPI(provider.npi)) {
    errors.push({
      code: 'INVALID_NPI',
      message: `${fieldPrefix} NPI '${provider.npi}' is invalid (failed Luhn check)`,
      field: `${fieldPrefix}.npi`,
      severity: 'error',
    });
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// ICD-10 DIAGNOSIS VALIDATION
// ============================================================================

/**
 * ICD-10-CM code format patterns
 */
const ICD10_CM_PATTERN = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/i;
const ICD10_PCS_PATTERN = /^[0-9A-HJ-NP-Z]{7}$/i;

/**
 * Common invalid ICD-10 codes (placeholder codes, etc.)
 */
const INVALID_ICD10_CODES = new Set([
  'Z000', 'Z001', // Placeholder codes
  'T148', 'T149', // Unspecified injury codes (often rejected)
]);

/**
 * Validates an ICD-10-CM diagnosis code format
 * @param code - ICD-10-CM code (with or without decimal)
 * @returns true if format is valid
 */
function validateICD10CMFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Remove decimal point for comparison
  const cleanCode = code.replace('.', '').toUpperCase();

  // Must be 3-7 characters
  if (cleanCode.length < 3 || cleanCode.length > 7) {
    return false;
  }

  // Check pattern (first char is letter except U, digits/letters follow)
  if (!/^[A-TV-Z]\d{2}[A-Z0-9]{0,4}$/i.test(cleanCode)) {
    return false;
  }

  return true;
}

/**
 * Validates an ICD-10-PCS procedure code format
 */
function validateICD10PCSFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  const cleanCode = code.replace(/[\s.-]/g, '').toUpperCase();
  return ICD10_PCS_PATTERN.test(cleanCode);
}

/**
 * Validates diagnosis information
 */
export function validateDiagnosis(
  diagnosis: DiagnosisInfo | undefined,
  fieldPrefix: string = 'diagnosis'
): { isValid: boolean; errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!diagnosis) {
    errors.push({
      code: 'MISSING_DIAGNOSIS',
      message: `${fieldPrefix} is required`,
      field: fieldPrefix,
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  if (!diagnosis.code) {
    errors.push({
      code: 'MISSING_DIAGNOSIS_CODE',
      message: `${fieldPrefix} code is required`,
      field: `${fieldPrefix}.code`,
      severity: 'error',
    });
  } else {
    // Validate based on qualifier
    const cleanCode = diagnosis.code.replace('.', '').toUpperCase();

    if (diagnosis.qualifier === 'ABK' || diagnosis.qualifier === 'ABF') {
      // ICD-10-CM or ICD-9-CM diagnosis
      if (!validateICD10CMFormat(diagnosis.code)) {
        errors.push({
          code: 'INVALID_DIAGNOSIS_FORMAT',
          message: `${fieldPrefix} code '${diagnosis.code}' is not a valid ICD-10-CM format`,
          field: `${fieldPrefix}.code`,
          severity: 'error',
        });
      }
    } else if (diagnosis.qualifier === 'ABJ') {
      // ICD-10-PCS procedure
      if (!validateICD10PCSFormat(diagnosis.code)) {
        errors.push({
          code: 'INVALID_PROCEDURE_FORMAT',
          message: `${fieldPrefix} code '${diagnosis.code}' is not a valid ICD-10-PCS format`,
          field: `${fieldPrefix}.code`,
          severity: 'error',
        });
      }
    }

    // Check for commonly rejected codes
    if (INVALID_ICD10_CODES.has(cleanCode)) {
      warnings.push({
        code: 'POTENTIALLY_REJECTED_CODE',
        message: `${fieldPrefix} code '${diagnosis.code}' is commonly rejected by payers`,
        field: `${fieldPrefix}.code`,
      });
    }

    // Check for unspecified codes (ends in 9 for many categories)
    if (/9$/.test(cleanCode) && cleanCode.length >= 4) {
      warnings.push({
        code: 'UNSPECIFIED_CODE',
        message: `${fieldPrefix} code '${diagnosis.code}' may be unspecified; consider using a more specific code`,
        field: `${fieldPrefix}.code`,
      });
    }
  }

  // Validate pointer
  if (diagnosis.pointer < 1 || diagnosis.pointer > 12) {
    errors.push({
      code: 'INVALID_DIAGNOSIS_POINTER',
      message: `${fieldPrefix} pointer must be between 1 and 12`,
      field: `${fieldPrefix}.pointer`,
      severity: 'error',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CPT/HCPCS PROCEDURE VALIDATION
// ============================================================================

/**
 * CPT code pattern (5 digits, may be followed by modifier)
 */
const CPT_PATTERN = /^\d{5}$/;

/**
 * HCPCS Level II pattern (letter + 4 digits)
 */
const HCPCS_PATTERN = /^[A-V]\d{4}$/i;

/**
 * Valid modifier pattern (2 alphanumeric characters)
 */
const MODIFIER_PATTERN = /^[A-Z0-9]{2}$/i;

/**
 * Mutually exclusive modifier pairs
 */
const MUTUALLY_EXCLUSIVE_MODIFIERS: Array<[string, string]> = [
  ['26', 'TC'], // Professional vs Technical component
  ['LT', 'RT'], // Left vs Right
  ['50', 'LT'], // Bilateral vs Left
  ['50', 'RT'], // Bilateral vs Right
  ['51', '59'], // Multiple procedures vs Distinct
  ['76', '77'], // Repeat procedure same/different physician
];

/**
 * Validates a CPT or HCPCS procedure code format
 */
function validateProcedureCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  const cleanCode = code.trim().toUpperCase();
  return CPT_PATTERN.test(cleanCode) || HCPCS_PATTERN.test(cleanCode);
}

/**
 * Validates procedure code modifiers
 */
export function validateModifiers(
  modifiers: string[] | undefined
): { isValid: boolean; errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!modifiers || modifiers.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Check for too many modifiers
  if (modifiers.length > 4) {
    errors.push({
      code: 'TOO_MANY_MODIFIERS',
      message: 'Maximum of 4 modifiers allowed per procedure',
      field: 'modifiers',
      severity: 'error',
    });
  }

  // Validate each modifier format
  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i].toUpperCase();
    if (!MODIFIER_PATTERN.test(modifier)) {
      errors.push({
        code: 'INVALID_MODIFIER_FORMAT',
        message: `Modifier '${modifiers[i]}' is not a valid 2-character alphanumeric code`,
        field: `modifiers[${i}]`,
        severity: 'error',
      });
    }
  }

  // Check for duplicate modifiers
  const uniqueModifiers = new Set(modifiers.map(m => m.toUpperCase()));
  if (uniqueModifiers.size !== modifiers.length) {
    errors.push({
      code: 'DUPLICATE_MODIFIERS',
      message: 'Duplicate modifiers are not allowed',
      field: 'modifiers',
      severity: 'error',
    });
  }

  // Check for mutually exclusive modifiers
  const modifierSet = new Set(modifiers.map(m => m.toUpperCase()));
  for (const [mod1, mod2] of MUTUALLY_EXCLUSIVE_MODIFIERS) {
    if (modifierSet.has(mod1) && modifierSet.has(mod2)) {
      errors.push({
        code: 'MUTUALLY_EXCLUSIVE_MODIFIERS',
        message: `Modifiers '${mod1}' and '${mod2}' are mutually exclusive`,
        field: 'modifiers',
        severity: 'error',
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete procedure/service line
 */
export function validateProcedures(
  procedures: ProcedureInfo[] | undefined,
  diagnosisCount: number
): { isValid: boolean; errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!procedures || procedures.length === 0) {
    errors.push({
      code: 'NO_SERVICE_LINES',
      message: 'At least one service line is required',
      field: 'serviceLines',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  for (let i = 0; i < procedures.length; i++) {
    const proc = procedures[i];
    const prefix = `serviceLines[${i}]`;

    // Validate procedure code
    if (!proc.code) {
      errors.push({
        code: 'MISSING_PROCEDURE_CODE',
        message: `Service line ${i + 1}: Procedure code is required`,
        field: `${prefix}.code`,
        severity: 'error',
      });
    } else if (!validateProcedureCodeFormat(proc.code)) {
      errors.push({
        code: 'INVALID_PROCEDURE_FORMAT',
        message: `Service line ${i + 1}: Procedure code '${proc.code}' is not a valid CPT/HCPCS format`,
        field: `${prefix}.code`,
        severity: 'error',
      });
    }

    // Validate modifiers
    const modResult = validateModifiers(proc.modifiers);
    errors.push(...modResult.errors.map(e => ({ ...e, field: `${prefix}.${e.field}` })));
    warnings.push(...modResult.warnings.map(w => ({ ...w, field: `${prefix}.${w.field}` })));

    // Validate charge amount
    if (proc.chargeAmount === undefined || proc.chargeAmount === null) {
      errors.push({
        code: 'MISSING_CHARGE_AMOUNT',
        message: `Service line ${i + 1}: Charge amount is required`,
        field: `${prefix}.chargeAmount`,
        severity: 'error',
      });
    } else if (proc.chargeAmount < 0) {
      errors.push({
        code: 'NEGATIVE_CHARGE',
        message: `Service line ${i + 1}: Charge amount cannot be negative`,
        field: `${prefix}.chargeAmount`,
        severity: 'error',
      });
    } else if (proc.chargeAmount === 0) {
      warnings.push({
        code: 'ZERO_CHARGE',
        message: `Service line ${i + 1}: Charge amount is zero`,
        field: `${prefix}.chargeAmount`,
      });
    }

    // Validate units
    if (!proc.units || proc.units < 1) {
      errors.push({
        code: 'INVALID_UNITS',
        message: `Service line ${i + 1}: Units must be at least 1`,
        field: `${prefix}.units`,
        severity: 'error',
      });
    } else if (proc.units > 999) {
      warnings.push({
        code: 'HIGH_UNITS',
        message: `Service line ${i + 1}: Units (${proc.units}) is unusually high`,
        field: `${prefix}.units`,
      });
    }

    // Validate service date
    if (!proc.serviceDate) {
      errors.push({
        code: 'MISSING_SERVICE_DATE',
        message: `Service line ${i + 1}: Service date is required`,
        field: `${prefix}.serviceDate`,
        severity: 'error',
      });
    } else if (!isValidDate(proc.serviceDate)) {
      errors.push({
        code: 'INVALID_SERVICE_DATE',
        message: `Service line ${i + 1}: Service date '${proc.serviceDate}' is invalid`,
        field: `${prefix}.serviceDate`,
        severity: 'error',
      });
    }

    // Validate diagnosis pointers
    if (!proc.diagnosisPointers || proc.diagnosisPointers.length === 0) {
      errors.push({
        code: 'MISSING_DIAGNOSIS_POINTERS',
        message: `Service line ${i + 1}: At least one diagnosis pointer is required`,
        field: `${prefix}.diagnosisPointers`,
        severity: 'error',
      });
    } else {
      for (const pointer of proc.diagnosisPointers) {
        if (pointer < 1 || pointer > diagnosisCount) {
          errors.push({
            code: 'INVALID_DIAGNOSIS_POINTER',
            message: `Service line ${i + 1}: Diagnosis pointer ${pointer} is out of range (1-${diagnosisCount})`,
            field: `${prefix}.diagnosisPointers`,
            severity: 'error',
          });
        }
      }
    }

    // Validate place of service
    if (!proc.placeOfService) {
      errors.push({
        code: 'MISSING_PLACE_OF_SERVICE',
        message: `Service line ${i + 1}: Place of service is required`,
        field: `${prefix}.placeOfService`,
        severity: 'error',
      });
    } else if (!/^\d{2}$/.test(proc.placeOfService)) {
      errors.push({
        code: 'INVALID_PLACE_OF_SERVICE',
        message: `Service line ${i + 1}: Place of service must be a 2-digit code`,
        field: `${prefix}.placeOfService`,
        severity: 'error',
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================================================
// TIMELY FILING VALIDATION
// ============================================================================

/**
 * Default timely filing limits by payer type (in days)
 */
const DEFAULT_FILING_LIMITS: Record<string, number> = {
  MA: 365, // Medicare Part A - 1 year
  MB: 365, // Medicare Part B - 1 year
  MC: 365, // Medicaid - varies by state, typically 1 year
  CH: 365, // TRICARE - 1 year
  VA: 365, // VA - 1 year
  BL: 365, // BCBS - typically 1 year
  CI: 90, // Commercial - varies, often 90 days
  HM: 90, // HMO - varies, often 90 days
  WC: 365, // Workers Comp - typically 1 year
  DEFAULT: 365, // Default to 1 year
};

/**
 * Validates timely filing deadline
 */
export function validateTimeliness(
  serviceDate: string | undefined,
  submissionDate: Date,
  claimFilingIndicator: string,
  customFilingLimit?: number
): { isValid: boolean; errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!serviceDate) {
    errors.push({
      code: 'MISSING_SERVICE_DATE',
      message: 'Service date is required for timely filing validation',
      field: 'serviceDate',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  const serviceDateObj = new Date(serviceDate);
  if (isNaN(serviceDateObj.getTime())) {
    errors.push({
      code: 'INVALID_SERVICE_DATE',
      message: `Invalid service date format: ${serviceDate}`,
      field: 'serviceDate',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  // Get filing limit
  const filingLimit = customFilingLimit ||
    DEFAULT_FILING_LIMITS[claimFilingIndicator] ||
    DEFAULT_FILING_LIMITS.DEFAULT;

  // Calculate days since service
  const daysSinceService = Math.floor(
    (submissionDate.getTime() - serviceDateObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if past filing deadline
  if (daysSinceService > filingLimit) {
    errors.push({
      code: 'TIMELY_FILING_EXCEEDED',
      message: `Claim is ${daysSinceService} days old, exceeds ${filingLimit}-day filing limit for ${claimFilingIndicator}`,
      field: 'serviceDate',
      severity: 'error',
    });
  } else if (daysSinceService > filingLimit * 0.9) {
    // Warn if within 10% of deadline
    const daysRemaining = filingLimit - daysSinceService;
    warnings.push({
      code: 'APPROACHING_FILING_DEADLINE',
      message: `Claim is approaching filing deadline (${daysRemaining} days remaining)`,
      field: 'serviceDate',
    });
  }

  // Warn if service date is in the future
  if (serviceDateObj > submissionDate) {
    warnings.push({
      code: 'FUTURE_SERVICE_DATE',
      message: 'Service date is in the future',
      field: 'serviceDate',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================================================
// COMPLETE CLAIM VALIDATION
// ============================================================================

/**
 * Validates required claim fields
 */
export function validateClaimData(
  claim: ProfessionalClaim | InstitutionalClaim,
  claimType: 'professional' | 'institutional'
): ValidationResult {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  // Validate header
  const headerResult = validateClaimHeader(claim.header);
  errors.push(...headerResult.errors);
  warnings.push(...headerResult.warnings);

  // Validate billing provider
  const billingResult = validateProviderNPI(claim.billingProvider, 'billingProvider');
  errors.push(...billingResult.errors);

  if (claim.billingProvider) {
    if (!claim.billingProvider.taxId) {
      errors.push({
        code: 'MISSING_TAX_ID',
        message: 'Billing provider Tax ID is required',
        field: 'billingProvider.taxId',
        severity: 'error',
      });
    } else if (!/^\d{9}$/.test(claim.billingProvider.taxId.replace(/-/g, ''))) {
      errors.push({
        code: 'INVALID_TAX_ID',
        message: 'Billing provider Tax ID must be 9 digits',
        field: 'billingProvider.taxId',
        severity: 'error',
      });
    }

    // Validate address
    const addressResult = validateAddress(claim.billingProvider, 'billingProvider');
    errors.push(...addressResult.errors);
    warnings.push(...addressResult.warnings);
  }

  // Validate rendering provider if present
  if (claim.renderingProvider) {
    const renderingResult = validateProviderNPI(claim.renderingProvider, 'renderingProvider');
    errors.push(...renderingResult.errors);
  }

  // Validate subscriber
  const subscriberResult = validateSubscriber(claim.subscriber);
  errors.push(...subscriberResult.errors);
  warnings.push(...subscriberResult.warnings);

  // Validate patient
  const patientResult = validatePatient(claim.patient);
  errors.push(...patientResult.errors);
  warnings.push(...patientResult.warnings);

  // Validate payer
  const payerResult = validatePayer(claim.payer);
  errors.push(...payerResult.errors);
  warnings.push(...payerResult.warnings);

  // Validate diagnoses
  const totalDiagnosisCount = 1 + (claim.diagnoses.secondary?.length || 0);

  const principalDiagResult = validateDiagnosis(claim.diagnoses.principal, 'diagnoses.principal');
  errors.push(...principalDiagResult.errors);
  warnings.push(...principalDiagResult.warnings);

  if (claim.diagnoses.secondary) {
    for (let i = 0; i < claim.diagnoses.secondary.length; i++) {
      const secDiagResult = validateDiagnosis(
        claim.diagnoses.secondary[i],
        `diagnoses.secondary[${i}]`
      );
      errors.push(...secDiagResult.errors);
      warnings.push(...secDiagResult.warnings);
    }
  }

  // Validate procedures/services based on claim type
  if (claimType === 'professional') {
    const profClaim = claim as ProfessionalClaim;
    const procResult = validateProcedures(profClaim.serviceLines, totalDiagnosisCount);
    errors.push(...procResult.errors);
    warnings.push(...procResult.warnings);
  } else {
    const instClaim = claim as InstitutionalClaim;
    const revResult = validateRevenueLines(instClaim.revenueLines, totalDiagnosisCount);
    errors.push(...revResult.errors);
    warnings.push(...revResult.warnings);

    // Validate institutional-specific fields
    if (!instClaim.statementFromDate) {
      errors.push({
        code: 'MISSING_STATEMENT_FROM_DATE',
        message: 'Statement from date is required for institutional claims',
        field: 'statementFromDate',
        severity: 'error',
      });
    }

    if (!instClaim.statementThroughDate) {
      errors.push({
        code: 'MISSING_STATEMENT_THROUGH_DATE',
        message: 'Statement through date is required for institutional claims',
        field: 'statementThroughDate',
        severity: 'error',
      });
    }
  }

  // Validate timely filing (use the earliest service date)
  const serviceDate = getEarliestServiceDate(claim, claimType);
  if (serviceDate) {
    const timelyResult = validateTimeliness(
      serviceDate,
      new Date(),
      claim.payer.claimFilingIndicator
    );
    errors.push(...timelyResult.errors);
    warnings.push(...timelyResult.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

function validateClaimHeader(header: ClaimHeader): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!header.patientControlNumber) {
    errors.push({
      code: 'MISSING_PATIENT_CONTROL_NUMBER',
      message: 'Patient control number is required',
      field: 'header.patientControlNumber',
      severity: 'error',
    });
  } else if (header.patientControlNumber.length > 20) {
    errors.push({
      code: 'PATIENT_CONTROL_NUMBER_TOO_LONG',
      message: 'Patient control number cannot exceed 20 characters',
      field: 'header.patientControlNumber',
      severity: 'error',
    });
  }

  if (header.totalChargeAmount === undefined || header.totalChargeAmount === null) {
    errors.push({
      code: 'MISSING_TOTAL_CHARGE',
      message: 'Total charge amount is required',
      field: 'header.totalChargeAmount',
      severity: 'error',
    });
  } else if (header.totalChargeAmount < 0) {
    errors.push({
      code: 'NEGATIVE_TOTAL_CHARGE',
      message: 'Total charge amount cannot be negative',
      field: 'header.totalChargeAmount',
      severity: 'error',
    });
  }

  // Validate claim frequency code for replacements/voids
  if (header.claimFrequencyCode === '7' || header.claimFrequencyCode === '8') {
    if (!header.originalClaimNumber) {
      errors.push({
        code: 'MISSING_ORIGINAL_CLAIM_NUMBER',
        message: 'Original claim number is required for replacement/void claims',
        field: 'header.originalClaimNumber',
        severity: 'error',
      });
    }
  }

  return { errors, warnings };
}

function validateSubscriber(subscriber: SubscriberInfo | undefined): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!subscriber) {
    errors.push({
      code: 'MISSING_SUBSCRIBER',
      message: 'Subscriber information is required',
      field: 'subscriber',
      severity: 'error',
    });
    return { errors, warnings };
  }

  if (!subscriber.memberId) {
    errors.push({
      code: 'MISSING_MEMBER_ID',
      message: 'Subscriber member ID is required',
      field: 'subscriber.memberId',
      severity: 'error',
    });
  }

  if (!subscriber.firstName) {
    errors.push({
      code: 'MISSING_SUBSCRIBER_FIRST_NAME',
      message: 'Subscriber first name is required',
      field: 'subscriber.firstName',
      severity: 'error',
    });
  }

  if (!subscriber.lastName) {
    errors.push({
      code: 'MISSING_SUBSCRIBER_LAST_NAME',
      message: 'Subscriber last name is required',
      field: 'subscriber.lastName',
      severity: 'error',
    });
  }

  return { errors, warnings };
}

function validatePatient(patient: PatientInfo | undefined): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!patient) {
    errors.push({
      code: 'MISSING_PATIENT',
      message: 'Patient information is required',
      field: 'patient',
      severity: 'error',
    });
    return { errors, warnings };
  }

  if (!patient.firstName) {
    errors.push({
      code: 'MISSING_PATIENT_FIRST_NAME',
      message: 'Patient first name is required',
      field: 'patient.firstName',
      severity: 'error',
    });
  }

  if (!patient.lastName) {
    errors.push({
      code: 'MISSING_PATIENT_LAST_NAME',
      message: 'Patient last name is required',
      field: 'patient.lastName',
      severity: 'error',
    });
  }

  if (!patient.dateOfBirth) {
    errors.push({
      code: 'MISSING_PATIENT_DOB',
      message: 'Patient date of birth is required',
      field: 'patient.dateOfBirth',
      severity: 'error',
    });
  } else if (!isValidDate(patient.dateOfBirth)) {
    errors.push({
      code: 'INVALID_PATIENT_DOB',
      message: `Patient date of birth '${patient.dateOfBirth}' is invalid`,
      field: 'patient.dateOfBirth',
      severity: 'error',
    });
  }

  if (!patient.gender) {
    errors.push({
      code: 'MISSING_PATIENT_GENDER',
      message: 'Patient gender is required',
      field: 'patient.gender',
      severity: 'error',
    });
  }

  // Validate address
  const addressResult = validateAddress(patient, 'patient');
  errors.push(...addressResult.errors);
  warnings.push(...addressResult.warnings);

  return { errors, warnings };
}

function validatePayer(payer: PayerInfo | undefined): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!payer) {
    errors.push({
      code: 'MISSING_PAYER',
      message: 'Payer information is required',
      field: 'payer',
      severity: 'error',
    });
    return { errors, warnings };
  }

  if (!payer.payerId) {
    errors.push({
      code: 'MISSING_PAYER_ID',
      message: 'Payer ID is required',
      field: 'payer.payerId',
      severity: 'error',
    });
  }

  if (!payer.name) {
    errors.push({
      code: 'MISSING_PAYER_NAME',
      message: 'Payer name is required',
      field: 'payer.name',
      severity: 'error',
    });
  }

  if (!payer.claimFilingIndicator) {
    errors.push({
      code: 'MISSING_CLAIM_FILING_INDICATOR',
      message: 'Claim filing indicator is required',
      field: 'payer.claimFilingIndicator',
      severity: 'error',
    });
  }

  return { errors, warnings };
}

function validateAddress(
  entity: { address1?: string; city?: string; state?: string; zipCode?: string },
  prefix: string
): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!entity.address1) {
    errors.push({
      code: 'MISSING_ADDRESS',
      message: `${prefix} address is required`,
      field: `${prefix}.address1`,
      severity: 'error',
    });
  }

  if (!entity.city) {
    errors.push({
      code: 'MISSING_CITY',
      message: `${prefix} city is required`,
      field: `${prefix}.city`,
      severity: 'error',
    });
  }

  if (!entity.state) {
    errors.push({
      code: 'MISSING_STATE',
      message: `${prefix} state is required`,
      field: `${prefix}.state`,
      severity: 'error',
    });
  } else if (!/^[A-Z]{2}$/.test(entity.state.toUpperCase())) {
    errors.push({
      code: 'INVALID_STATE',
      message: `${prefix} state must be a 2-letter code`,
      field: `${prefix}.state`,
      severity: 'error',
    });
  }

  if (!entity.zipCode) {
    errors.push({
      code: 'MISSING_ZIP_CODE',
      message: `${prefix} ZIP code is required`,
      field: `${prefix}.zipCode`,
      severity: 'error',
    });
  } else if (!/^\d{5}(-?\d{4})?$/.test(entity.zipCode)) {
    errors.push({
      code: 'INVALID_ZIP_CODE',
      message: `${prefix} ZIP code must be 5 or 9 digits`,
      field: `${prefix}.zipCode`,
      severity: 'error',
    });
  }

  return { errors, warnings };
}

function validateRevenueLines(
  revenueLines: RevenueCodeLine[] | undefined,
  diagnosisCount: number
): { errors: ClaimError[]; warnings: ClaimWarning[] } {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  if (!revenueLines || revenueLines.length === 0) {
    errors.push({
      code: 'NO_REVENUE_LINES',
      message: 'At least one revenue code line is required for institutional claims',
      field: 'revenueLines',
      severity: 'error',
    });
    return { errors, warnings };
  }

  for (let i = 0; i < revenueLines.length; i++) {
    const line = revenueLines[i];
    const prefix = `revenueLines[${i}]`;

    // Validate revenue code
    if (!line.revenueCode) {
      errors.push({
        code: 'MISSING_REVENUE_CODE',
        message: `Revenue line ${i + 1}: Revenue code is required`,
        field: `${prefix}.revenueCode`,
        severity: 'error',
      });
    } else if (!/^\d{4}$/.test(line.revenueCode)) {
      errors.push({
        code: 'INVALID_REVENUE_CODE',
        message: `Revenue line ${i + 1}: Revenue code must be 4 digits`,
        field: `${prefix}.revenueCode`,
        severity: 'error',
      });
    }

    // Validate charge amount
    if (line.chargeAmount === undefined || line.chargeAmount === null) {
      errors.push({
        code: 'MISSING_CHARGE_AMOUNT',
        message: `Revenue line ${i + 1}: Charge amount is required`,
        field: `${prefix}.chargeAmount`,
        severity: 'error',
      });
    } else if (line.chargeAmount < 0) {
      errors.push({
        code: 'NEGATIVE_CHARGE',
        message: `Revenue line ${i + 1}: Charge amount cannot be negative`,
        field: `${prefix}.chargeAmount`,
        severity: 'error',
      });
    }

    // Validate service date
    if (!line.serviceDate) {
      errors.push({
        code: 'MISSING_SERVICE_DATE',
        message: `Revenue line ${i + 1}: Service date is required`,
        field: `${prefix}.serviceDate`,
        severity: 'error',
      });
    }

    // Validate units
    if (!line.units || line.units < 1) {
      errors.push({
        code: 'INVALID_UNITS',
        message: `Revenue line ${i + 1}: Units must be at least 1`,
        field: `${prefix}.units`,
        severity: 'error',
      });
    }
  }

  // Check for required 0001 (Total) revenue code
  const hasTotal = revenueLines.some(l => l.revenueCode === '0001');
  if (!hasTotal) {
    warnings.push({
      code: 'MISSING_TOTAL_REVENUE_LINE',
      message: 'Consider adding revenue code 0001 (Total) as the last line',
      field: 'revenueLines',
    });
  }

  return { errors, warnings };
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  // Check if it's a reasonable date (not before 1900 or too far in future)
  const year = date.getFullYear();
  if (year < 1900 || year > new Date().getFullYear() + 1) return false;

  return true;
}

function getEarliestServiceDate(
  claim: ProfessionalClaim | InstitutionalClaim,
  claimType: 'professional' | 'institutional'
): string | undefined {
  if (claimType === 'professional') {
    const profClaim = claim as ProfessionalClaim;
    if (!profClaim.serviceLines || profClaim.serviceLines.length === 0) {
      return undefined;
    }
    return profClaim.serviceLines
      .map(l => l.serviceDate)
      .filter(d => d)
      .sort()[0];
  } else {
    const instClaim = claim as InstitutionalClaim;
    return instClaim.statementFromDate ||
      (instClaim.revenueLines && instClaim.revenueLines.length > 0
        ? instClaim.revenueLines.map(l => l.serviceDate).filter(d => d).sort()[0]
        : undefined);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  validateICD10CMFormat,
  validateICD10PCSFormat,
  validateProcedureCodeFormat,
};

