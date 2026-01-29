/**
 * Machine Readable File (MRF) Generation
 *
 * Generates CMS-compliant machine readable files for hospital price transparency.
 * Per CMS regulations (45 CFR 180), hospitals must publish:
 *
 * 1. A comprehensive machine-readable file with all standard charges
 * 2. Payer-specific negotiated rates
 * 3. De-identified minimum and maximum charges
 * 4. Discounted cash prices
 *
 * File format follows CMS schema specifications for JSON/CSV output.
 *
 * Reference: CMS Hospital Price Transparency Technical Implementation Guide
 */

// ============================================================================
// TYPES - CMS MRF SCHEMA
// ============================================================================

/** Hospital identifier information */
export interface HospitalIdentification {
  /** Hospital name */
  hospital_name: string;
  /** Hospital address - street */
  street_address: string;
  /** Hospital address - city */
  city: string;
  /** Hospital address - state */
  state: string;
  /** Hospital address - zip */
  zip_code: string;
  /** CMS Certification Number (CCN) */
  hospital_ccn?: string;
  /** Hospital NPI */
  hospital_npi?: string;
  /** Hospital EIN */
  hospital_ein?: string;
  /** License number */
  hospital_license_number?: string;
  /** Affirmation statement */
  last_updated_on: string;
  /** Version of the file */
  version: string;
  /** URL where the file is published */
  file_url?: string;
}

/** Charge setting/location */
export type ChargeSetting = 'inpatient' | 'outpatient' | 'both';

/** Modifier information */
export interface ModifierInformation {
  /** Modifier code */
  modifier: string;
  /** Modifier description */
  modifier_description: string;
}

/** Billing code information */
export interface BillingCodeInformation {
  /** Billing code (CPT, HCPCS, DRG, etc.) */
  code: string;
  /** Billing code type */
  type: 'CPT' | 'HCPCS' | 'DRG' | 'MS-DRG' | 'APC' | 'ICD' | 'NDC' | 'CUSTOM';
  /** Billing code description */
  description?: string;
}

/** Payer-specific negotiated charge */
export interface PayerSpecificNegotiatedCharge {
  /** Payer name */
  payer_name: string;
  /** Plan name */
  plan_name: string;
  /** Negotiated dollar amount */
  standard_charge_dollar?: number;
  /** Negotiated percentage (of charges or Medicare) */
  standard_charge_percentage?: number;
  /** Algorithm for calculating charge */
  standard_charge_algorithm?: string;
  /** Additional information about the methodology */
  methodology?: 'case rate' | 'fee schedule' | 'percent of charges' | 'percent of Medicare' | 'per diem' | 'capitation' | 'other';
  /** Additional payer-specific notes */
  additional_generic_notes?: string;
}

/** Standard charge item - core MRF data structure */
export interface StandardChargeItem {
  /** Plain language description (required) */
  description: string;
  /** Drug information if applicable */
  drug_information?: {
    unit: string;
    type: string;
  };
  /** Billing code information */
  code_information: BillingCodeInformation[];
  /** Modifiers if applicable */
  modifiers?: ModifierInformation[];
  /** Charge setting (inpatient/outpatient) */
  setting: ChargeSetting;
  /** Gross charge (chargemaster) */
  standard_charge_gross: number;
  /** Discounted cash price */
  standard_charge_discounted_cash?: number;
  /** De-identified minimum */
  standard_charge_min: number;
  /** De-identified maximum */
  standard_charge_max: number;
  /** Payer-specific negotiated charges */
  payer_specific_negotiated_charges: PayerSpecificNegotiatedCharge[];
  /** Additional notes */
  additional_generic_notes?: string;
}

/** Complete MRF structure per CMS schema */
export interface MachineReadableFile {
  /** Hospital identification */
  hospital_identification: HospitalIdentification;
  /** Affirmation regarding accuracy */
  affirmation: {
    affirmation: string;
    confirm_affirmation: boolean;
  };
  /** All standard charges */
  standard_charge_information: StandardChargeItem[];
}

/** MRF validation result */
export interface MRFValidationResult {
  /** Whether the file is valid */
  isValid: boolean;
  /** Validation errors */
  errors: MRFValidationError[];
  /** Validation warnings */
  warnings: MRFValidationWarning[];
  /** Summary statistics */
  statistics: {
    totalItems: number;
    itemsWithGrossCharge: number;
    itemsWithCashPrice: number;
    itemsWithPayerRates: number;
    uniquePayers: number;
    uniquePlans: number;
    uniqueCodes: number;
  };
}

/** Validation error */
export interface MRFValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Location in file (item index, field) */
  location?: string;
  /** Severity */
  severity: 'error';
}

/** Validation warning */
export interface MRFValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Location in file */
  location?: string;
  /** Severity */
  severity: 'warning';
}

/** Chargemaster entry for export */
export interface ChargemasterEntry {
  /** Internal charge code */
  chargeCode: string;
  /** CPT/HCPCS code */
  cptCode?: string;
  /** Revenue code */
  revenueCode?: string;
  /** Description */
  description: string;
  /** Department */
  department?: string;
  /** Charge amount */
  chargeAmount: number;
  /** Cost */
  cost?: number;
  /** Effective date */
  effectiveDate: Date;
  /** Active status */
  isActive: boolean;
}

/** Hospital configuration for MRF generation */
export interface HospitalConfig {
  /** Hospital ID */
  hospitalId: string;
  /** Hospital name */
  name: string;
  /** Address */
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  /** CMS Certification Number */
  ccn?: string;
  /** NPI */
  npi?: string;
  /** EIN */
  ein?: string;
  /** License number */
  licenseNumber?: string;
  /** Discounted cash price percentage */
  cashDiscountPercent: number;
  /** URL where MRF will be published */
  publicationUrl?: string;
}

/** Payer contract summary */
export interface PayerContractSummary {
  payerId: string;
  payerName: string;
  planName: string;
  methodology: string;
  rates: Map<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Required affirmation text per CMS */
const CMS_AFFIRMATION_TEXT =
  'To the best of its knowledge and belief, the hospital has included all applicable standard charge information in accordance with the requirements of 45 CFR 180.50, and the information encoded is true, accurate, and complete as of the date indicated.';

/** Current MRF schema version */
const MRF_SCHEMA_VERSION = '2.0.0';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date as YYYY-MM-DD for MRF
 */
function formatMRFDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get billing code type from code format
 */
function getBillingCodeType(
  code: string
): 'CPT' | 'HCPCS' | 'DRG' | 'MS-DRG' | 'CUSTOM' {
  // CPT codes are 5 digits
  if (/^\d{5}$/.test(code)) {
    return 'CPT';
  }
  // HCPCS codes start with a letter followed by 4 digits
  if (/^[A-Z]\d{4}$/.test(code)) {
    return 'HCPCS';
  }
  // MS-DRG codes are 3 digits
  if (/^\d{3}$/.test(code)) {
    return 'MS-DRG';
  }
  return 'CUSTOM';
}

/**
 * Calculate de-identified min/max from payer rates
 */
function calculateMinMax(
  grossCharge: number,
  payerRates: number[]
): { min: number; max: number } {
  if (payerRates.length === 0) {
    return { min: grossCharge, max: grossCharge };
  }

  // Include gross charge in the range
  const allRates = [...payerRates, grossCharge];
  return {
    min: Math.min(...allRates),
    max: Math.max(...allRates),
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate a CMS-compliant Machine Readable File
 *
 * @param hospital - Hospital configuration
 * @param chargemaster - Array of chargemaster entries
 * @param payerContracts - Array of payer contract summaries
 * @returns Complete MRF object
 */
export function generateMachineReadableFile(
  hospital: HospitalConfig,
  chargemaster: ChargemasterEntry[],
  payerContracts: PayerContractSummary[] = []
): MachineReadableFile {
  const now = new Date();

  // Build hospital identification
  const hospitalIdentification: HospitalIdentification = {
    hospital_name: hospital.name,
    street_address: hospital.address.street,
    city: hospital.address.city,
    state: hospital.address.state,
    zip_code: hospital.address.zipCode,
    hospital_ccn: hospital.ccn,
    hospital_npi: hospital.npi,
    hospital_ein: hospital.ein,
    hospital_license_number: hospital.licenseNumber,
    last_updated_on: formatMRFDate(now),
    version: MRF_SCHEMA_VERSION,
    file_url: hospital.publicationUrl,
  };

  // Build standard charge information
  const standardChargeInformation: StandardChargeItem[] = [];

  for (const entry of chargemaster) {
    if (!entry.isActive) continue;

    // Get payer-specific rates for this code
    const payerCharges: PayerSpecificNegotiatedCharge[] = [];
    const payerRates: number[] = [];

    for (const contract of payerContracts) {
      const rate = entry.cptCode
        ? contract.rates.get(entry.cptCode)
        : undefined;

      if (rate !== undefined) {
        payerRates.push(rate);
        payerCharges.push({
          payer_name: contract.payerName,
          plan_name: contract.planName,
          standard_charge_dollar: rate,
          methodology: contract.methodology as any,
        });
      }
    }

    // Calculate min/max
    const { min, max } = calculateMinMax(entry.chargeAmount, payerRates);

    // Calculate discounted cash price
    const cashPrice =
      entry.chargeAmount * (1 - hospital.cashDiscountPercent / 100);

    // Build code information
    const codeInfo: BillingCodeInformation[] = [];
    if (entry.cptCode) {
      codeInfo.push({
        code: entry.cptCode,
        type: getBillingCodeType(entry.cptCode),
        description: entry.description,
      });
    }
    if (entry.revenueCode) {
      codeInfo.push({
        code: entry.revenueCode,
        type: 'CUSTOM',
        description: 'Revenue Code',
      });
    }
    if (codeInfo.length === 0) {
      codeInfo.push({
        code: entry.chargeCode,
        type: 'CUSTOM',
        description: entry.description,
      });
    }

    standardChargeInformation.push({
      description: entry.description,
      code_information: codeInfo,
      setting: 'both',
      standard_charge_gross: Math.round(entry.chargeAmount * 100) / 100,
      standard_charge_discounted_cash: Math.round(cashPrice * 100) / 100,
      standard_charge_min: Math.round(min * 100) / 100,
      standard_charge_max: Math.round(max * 100) / 100,
      payer_specific_negotiated_charges: payerCharges,
    });
  }

  return {
    hospital_identification: hospitalIdentification,
    affirmation: {
      affirmation: CMS_AFFIRMATION_TEXT,
      confirm_affirmation: true,
    },
    standard_charge_information: standardChargeInformation,
  };
}

/**
 * Generate chargemaster export file
 *
 * @param chargemaster - Array of chargemaster entries
 * @returns CSV-formatted string
 */
export function generateChargemasterFile(
  chargemaster: ChargemasterEntry[]
): string {
  const headers = [
    'Charge Code',
    'CPT/HCPCS Code',
    'Revenue Code',
    'Description',
    'Department',
    'Charge Amount',
    'Cost',
    'Effective Date',
    'Status',
  ];

  const rows = chargemaster.map((entry) => [
    entry.chargeCode,
    entry.cptCode || '',
    entry.revenueCode || '',
    `"${entry.description.replace(/"/g, '""')}"`,
    entry.department || '',
    entry.chargeAmount.toFixed(2),
    entry.cost?.toFixed(2) || '',
    formatMRFDate(entry.effectiveDate),
    entry.isActive ? 'Active' : 'Inactive',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Validate an MRF for CMS compliance
 *
 * @param mrf - Machine readable file to validate
 * @returns Validation result
 */
export function validateMRFCompliance(mrf: MachineReadableFile): MRFValidationResult {
  const errors: MRFValidationError[] = [];
  const warnings: MRFValidationWarning[] = [];

  // Statistics tracking
  let itemsWithGrossCharge = 0;
  let itemsWithCashPrice = 0;
  let itemsWithPayerRates = 0;
  const uniquePayers = new Set<string>();
  const uniquePlans = new Set<string>();
  const uniqueCodes = new Set<string>();

  // Validate hospital identification
  const hospital = mrf.hospital_identification;

  if (!hospital.hospital_name) {
    errors.push({
      code: 'HOSP_NAME_REQUIRED',
      message: 'Hospital name is required',
      location: 'hospital_identification.hospital_name',
      severity: 'error',
    });
  }

  if (!hospital.street_address) {
    errors.push({
      code: 'HOSP_ADDRESS_REQUIRED',
      message: 'Hospital street address is required',
      location: 'hospital_identification.street_address',
      severity: 'error',
    });
  }

  if (!hospital.last_updated_on) {
    errors.push({
      code: 'LAST_UPDATED_REQUIRED',
      message: 'Last updated date is required',
      location: 'hospital_identification.last_updated_on',
      severity: 'error',
    });
  }

  // Warn if identifiers are missing
  if (!hospital.hospital_ccn && !hospital.hospital_npi) {
    warnings.push({
      code: 'HOSP_ID_RECOMMENDED',
      message: 'CCN or NPI is recommended for hospital identification',
      location: 'hospital_identification',
      severity: 'warning',
    });
  }

  // Validate affirmation
  if (!mrf.affirmation.confirm_affirmation) {
    errors.push({
      code: 'AFFIRMATION_REQUIRED',
      message: 'Affirmation must be confirmed',
      location: 'affirmation.confirm_affirmation',
      severity: 'error',
    });
  }

  // Validate standard charge items
  const items = mrf.standard_charge_information;

  if (items.length === 0) {
    errors.push({
      code: 'NO_CHARGES',
      message: 'At least one standard charge item is required',
      location: 'standard_charge_information',
      severity: 'error',
    });
  }

  // Check minimum 300 shoppable services requirement
  if (items.length < 300) {
    warnings.push({
      code: 'MIN_ITEMS_RECOMMENDED',
      message: `CMS requires at least 300 shoppable services. Current: ${items.length}`,
      location: 'standard_charge_information',
      severity: 'warning',
    });
  }

  // Validate each item
  items.forEach((item, index) => {
    const loc = `standard_charge_information[${index}]`;

    // Description is required
    if (!item.description) {
      errors.push({
        code: 'DESCRIPTION_REQUIRED',
        message: 'Plain language description is required',
        location: `${loc}.description`,
        severity: 'error',
      });
    }

    // At least one billing code required
    if (!item.code_information || item.code_information.length === 0) {
      errors.push({
        code: 'CODE_REQUIRED',
        message: 'At least one billing code is required',
        location: `${loc}.code_information`,
        severity: 'error',
      });
    } else {
      item.code_information.forEach((code) => uniqueCodes.add(code.code));
    }

    // Gross charge must be positive
    if (item.standard_charge_gross <= 0) {
      errors.push({
        code: 'INVALID_GROSS_CHARGE',
        message: 'Gross charge must be greater than zero',
        location: `${loc}.standard_charge_gross`,
        severity: 'error',
      });
    } else {
      itemsWithGrossCharge++;
    }

    // Check for discounted cash price
    if (
      item.standard_charge_discounted_cash &&
      item.standard_charge_discounted_cash > 0
    ) {
      itemsWithCashPrice++;

      // Cash price should be less than gross
      if (item.standard_charge_discounted_cash >= item.standard_charge_gross) {
        warnings.push({
          code: 'CASH_PRICE_NOT_DISCOUNTED',
          message: 'Discounted cash price should be less than gross charge',
          location: `${loc}.standard_charge_discounted_cash`,
          severity: 'warning',
        });
      }
    }

    // Validate min/max
    if (item.standard_charge_min > item.standard_charge_max) {
      errors.push({
        code: 'INVALID_MIN_MAX',
        message: 'Minimum charge cannot be greater than maximum charge',
        location: `${loc}.standard_charge_min/max`,
        severity: 'error',
      });
    }

    // Check payer-specific charges
    if (
      item.payer_specific_negotiated_charges &&
      item.payer_specific_negotiated_charges.length > 0
    ) {
      itemsWithPayerRates++;

      item.payer_specific_negotiated_charges.forEach((payer, payerIndex) => {
        uniquePayers.add(payer.payer_name);
        uniquePlans.add(`${payer.payer_name}|${payer.plan_name}`);

        // Must have dollar amount, percentage, or algorithm
        if (
          !payer.standard_charge_dollar &&
          !payer.standard_charge_percentage &&
          !payer.standard_charge_algorithm
        ) {
          errors.push({
            code: 'PAYER_RATE_REQUIRED',
            message:
              'Payer-specific charge must include dollar, percentage, or algorithm',
            location: `${loc}.payer_specific_negotiated_charges[${payerIndex}]`,
            severity: 'error',
          });
        }
      });
    }
  });

  // Check for minimum payer coverage
  if (uniquePayers.size < 3) {
    warnings.push({
      code: 'FEW_PAYERS',
      message: `Only ${uniquePayers.size} payers included. More comprehensive payer coverage recommended.`,
      location: 'standard_charge_information',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    statistics: {
      totalItems: items.length,
      itemsWithGrossCharge,
      itemsWithCashPrice,
      itemsWithPayerRates,
      uniquePayers: uniquePayers.size,
      uniquePlans: uniquePlans.size,
      uniqueCodes: uniqueCodes.size,
    },
  };
}

/**
 * Convert MRF to JSON string
 *
 * @param mrf - Machine readable file
 * @param pretty - Whether to format with indentation
 * @returns JSON string
 */
export function mrfToJSON(mrf: MachineReadableFile, pretty: boolean = true): string {
  return pretty ? JSON.stringify(mrf, null, 2) : JSON.stringify(mrf);
}

/**
 * Convert MRF to CSV format (flattened)
 *
 * @param mrf - Machine readable file
 * @returns CSV string
 */
export function mrfToCSV(mrf: MachineReadableFile): string {
  const headers = [
    'Description',
    'Code',
    'Code Type',
    'Setting',
    'Gross Charge',
    'Cash Price',
    'Min',
    'Max',
    'Payer',
    'Plan',
    'Negotiated Rate',
    'Methodology',
  ];

  const rows: string[][] = [];

  for (const item of mrf.standard_charge_information) {
    const baseRow = [
      `"${item.description.replace(/"/g, '""')}"`,
      item.code_information[0]?.code || '',
      item.code_information[0]?.type || '',
      item.setting,
      item.standard_charge_gross.toFixed(2),
      item.standard_charge_discounted_cash?.toFixed(2) || '',
      item.standard_charge_min.toFixed(2),
      item.standard_charge_max.toFixed(2),
    ];

    if (item.payer_specific_negotiated_charges.length > 0) {
      for (const payer of item.payer_specific_negotiated_charges) {
        rows.push([
          ...baseRow,
          `"${payer.payer_name}"`,
          `"${payer.plan_name}"`,
          payer.standard_charge_dollar?.toFixed(2) ||
            (payer.standard_charge_percentage
              ? `${payer.standard_charge_percentage}%`
              : payer.standard_charge_algorithm || ''),
          payer.methodology || '',
        ]);
      }
    } else {
      rows.push([...baseRow, '', '', '', '']);
    }
  }

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Get MRF file metadata for storage
 *
 * @param mrf - Machine readable file
 * @param hospitalId - Hospital identifier
 * @returns Metadata object
 */
export function getMRFMetadata(
  mrf: MachineReadableFile,
  hospitalId: string
): {
  hospitalId: string;
  version: string;
  generatedAt: Date;
  itemCount: number;
  payerCount: number;
  fileSize: number;
  checksum: string;
} {
  const json = mrfToJSON(mrf, false);
  const uniquePayers = new Set<string>();

  for (const item of mrf.standard_charge_information) {
    for (const payer of item.payer_specific_negotiated_charges) {
      uniquePayers.add(payer.payer_name);
    }
  }

  // Simple checksum (in production, use proper hash)
  let checksum = 0;
  for (let i = 0; i < json.length; i++) {
    checksum = (checksum + json.charCodeAt(i)) % 0xffffffff;
  }

  return {
    hospitalId,
    version: mrf.hospital_identification.version,
    generatedAt: new Date(),
    itemCount: mrf.standard_charge_information.length,
    payerCount: uniquePayers.size,
    fileSize: json.length,
    checksum: checksum.toString(16),
  };
}

export default {
  generateMachineReadableFile,
  generateChargemasterFile,
  validateMRFCompliance,
  mrfToJSON,
  mrfToCSV,
  getMRFMetadata,
};
