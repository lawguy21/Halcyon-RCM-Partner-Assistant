/**
 * Halcyon RCM Partner Assistant - Column Mapper
 *
 * Mapping engine for transforming source data columns to standard fields.
 * Includes transform functions, validation, and auto-detection capabilities.
 */

import {
  ColumnMapping,
  ColumnDetectionResult,
  ColumnPattern,
  ImportError,
  StandardField,
} from './types';

/**
 * Common patterns for auto-detecting column mappings
 */
export const COLUMN_PATTERNS: ColumnPattern[] = [
  // Account identifiers
  { pattern: /^(account|acct)[\s_-]?(number|num|no|#|id)?$/i, targetField: 'accountNumber', confidence: 0.95 },
  { pattern: /^(mrn|medical[\s_-]?record|med[\s_-]?rec)[\s_-]?(number|num|no|#)?$/i, targetField: 'mrn', confidence: 0.95 },

  // Patient name fields
  { pattern: /^(patient|pt|pat)[\s_-]?(first|f)[\s_-]?(name)?$/i, targetField: 'patientFirstName', confidence: 0.9 },
  { pattern: /^(first|f)[\s_-]?(name)?$/i, targetField: 'patientFirstName', confidence: 0.7 },
  { pattern: /^(patient|pt|pat)[\s_-]?(last|l|sur)[\s_-]?(name)?$/i, targetField: 'patientLastName', confidence: 0.9 },
  { pattern: /^(last|l|sur)[\s_-]?(name)?$/i, targetField: 'patientLastName', confidence: 0.7 },
  { pattern: /^(patient|pt|pat)[\s_-]?(full[\s_-]?)?(name)$/i, targetField: 'patientFullName', confidence: 0.9 },
  { pattern: /^(name|full[\s_-]?name)$/i, targetField: 'patientFullName', confidence: 0.6 },

  // Dates
  { pattern: /^(date[\s_-]?of[\s_-]?birth|dob|birth[\s_-]?date|birthdate)$/i, targetField: 'dateOfBirth', confidence: 0.95, defaultTransform: 'date' },
  { pattern: /^(date[\s_-]?of[\s_-]?service|dos|service[\s_-]?date)$/i, targetField: 'dateOfService', confidence: 0.95, defaultTransform: 'date' },
  { pattern: /^(admit|admission)[\s_-]?(date|dt)?$/i, targetField: 'admitDate', confidence: 0.9, defaultTransform: 'date' },
  { pattern: /^(discharge|disch)[\s_-]?(date|dt)?$/i, targetField: 'dischargeDate', confidence: 0.9, defaultTransform: 'date' },
  { pattern: /^(last[\s_-]?activity|activity)[\s_-]?(date|dt)?$/i, targetField: 'lastActivityDate', confidence: 0.85, defaultTransform: 'date' },

  // Financial fields
  { pattern: /^(total[\s_-]?)?(charges?|chg)$/i, targetField: 'totalCharges', confidence: 0.9, defaultTransform: 'currency' },
  { pattern: /^(total[\s_-]?)?(payments?|pay|pmts?)$/i, targetField: 'totalPayments', confidence: 0.9, defaultTransform: 'currency' },
  { pattern: /^(account[\s_-]?)?(balance|bal)$/i, targetField: 'balance', confidence: 0.85, defaultTransform: 'currency' },
  { pattern: /^(ins|insurance)[\s_-]?(balance|bal)$/i, targetField: 'insuranceBalance', confidence: 0.9, defaultTransform: 'currency' },
  { pattern: /^(self[\s_-]?pay|sp|patient)[\s_-]?(balance|bal)$/i, targetField: 'selfPayBalance', confidence: 0.9, defaultTransform: 'currency' },

  // Insurance
  { pattern: /^(primary|prim|pri|1st)[\s_-]?(insurance|ins|payer|payor)?$/i, targetField: 'primaryInsurance', confidence: 0.85 },
  { pattern: /^(secondary|sec|2nd)[\s_-]?(insurance|ins|payer|payor)?$/i, targetField: 'secondaryInsurance', confidence: 0.85 },
  { pattern: /^(financial|fin)[\s_-]?(class|cls)$/i, targetField: 'financialClass', confidence: 0.9 },

  // Facility/Department
  { pattern: /^(facility|fac)[\s_-]?(code|cd)$/i, targetField: 'facilityCode', confidence: 0.9 },
  { pattern: /^(facility|fac)[\s_-]?(name)?$/i, targetField: 'facilityName', confidence: 0.8 },
  { pattern: /^(department|dept)[\s_-]?(code|cd)$/i, targetField: 'departmentCode', confidence: 0.9 },
  { pattern: /^(department|dept)[\s_-]?(name)?$/i, targetField: 'departmentName', confidence: 0.8 },

  // Encounter info
  { pattern: /^(encounter|enc|visit)[\s_-]?(type|typ)?$/i, targetField: 'encounterType', confidence: 0.85, defaultTransform: 'encounter_type' },
  { pattern: /^(patient|pt)[\s_-]?(type|typ|class)$/i, targetField: 'patientType', confidence: 0.85 },

  // Address fields
  { pattern: /^(address|addr)[\s_-]?(line[\s_-]?)?1?$/i, targetField: 'addressLine1', confidence: 0.8 },
  { pattern: /^(address|addr)[\s_-]?(line[\s_-]?)?2$/i, targetField: 'addressLine2', confidence: 0.9 },
  { pattern: /^city$/i, targetField: 'city', confidence: 0.95 },
  { pattern: /^state$/i, targetField: 'state', confidence: 0.95, defaultTransform: 'state_code' },
  { pattern: /^(zip|postal)[\s_-]?(code)?$/i, targetField: 'zipCode', confidence: 0.95 },
  { pattern: /^(phone|telephone|tel)[\s_-]?(number|num|#)?$/i, targetField: 'phone', confidence: 0.85 },
  { pattern: /^(email|e[\s_-]?mail)[\s_-]?(address)?$/i, targetField: 'email', confidence: 0.9 },

  // Guarantor
  { pattern: /^(guarantor|guar)[\s_-]?(name)?$/i, targetField: 'guarantorName', confidence: 0.9 },
  { pattern: /^(guarantor|guar)[\s_-]?(phone|tel)$/i, targetField: 'guarantorPhone', confidence: 0.9 },

  // Physicians
  { pattern: /^(attending|attend)[\s_-]?(physician|phys|dr|md)?$/i, targetField: 'attendingPhysician', confidence: 0.85 },
  { pattern: /^(referring|ref)[\s_-]?(physician|phys|dr|md)?$/i, targetField: 'referringPhysician', confidence: 0.85 },

  // Other
  { pattern: /^(notes?|comments?)$/i, targetField: 'notes', confidence: 0.8 },
  { pattern: /^(status|stat)$/i, targetField: 'status', confidence: 0.75 },
  { pattern: /^(aging|age)[\s_-]?(bucket|bin|category)?$/i, targetField: 'agingBucket', confidence: 0.85 },
];

/**
 * US State name to code mapping
 */
const STATE_CODES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR', 'guam': 'GU', 'virgin islands': 'VI',
};

/**
 * Encounter type normalization mapping
 */
const ENCOUNTER_TYPES: Record<string, string> = {
  'ip': 'Inpatient', 'inpatient': 'Inpatient', 'in': 'Inpatient',
  'op': 'Outpatient', 'outpatient': 'Outpatient', 'out': 'Outpatient',
  'er': 'Emergency', 'ed': 'Emergency', 'emergency': 'Emergency', 'emerg': 'Emergency',
  'obs': 'Observation', 'observation': 'Observation',
  'amb': 'Ambulatory', 'ambulatory': 'Ambulatory',
  'snf': 'Skilled Nursing', 'skilled nursing': 'Skilled Nursing',
  'hh': 'Home Health', 'home health': 'Home Health',
  'lab': 'Laboratory', 'laboratory': 'Laboratory',
  'rad': 'Radiology', 'radiology': 'Radiology',
  'surg': 'Surgery', 'surgery': 'Surgery', 'surgical': 'Surgery',
};

/**
 * Transform functions for different data types
 */
export const transforms = {
  /**
   * Parse and normalize date values
   */
  date: (value: string, dateFormat?: string): Date | null => {
    if (!value || value.trim() === '') return null;

    const cleaned = value.trim();

    // Try ISO format first
    const isoDate = new Date(cleaned);
    if (!isNaN(isoDate.getTime()) && cleaned.includes('-')) {
      return isoDate;
    }

    // Common date formats
    const formats = [
      // MM/DD/YYYY
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(+m[3], +m[1] - 1, +m[2]) },
      // MM-DD-YYYY
      { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(+m[3], +m[1] - 1, +m[2]) },
      // YYYY/MM/DD
      { pattern: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
      // YYYYMMDD
      { pattern: /^(\d{4})(\d{2})(\d{2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
      // DD-MMM-YYYY (e.g., 15-Jan-2024)
      { pattern: /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(`${m[2]} ${m[1]}, ${m[3]}`) },
      // MM/DD/YY
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, parse: (m: RegExpMatchArray) => {
        const year = +m[3] > 50 ? 1900 + +m[3] : 2000 + +m[3];
        return new Date(year, +m[1] - 1, +m[2]);
      }},
    ];

    for (const format of formats) {
      const match = cleaned.match(format.pattern);
      if (match) {
        const date = format.parse(match);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Last resort: try native parsing
    const fallback = new Date(cleaned);
    return isNaN(fallback.getTime()) ? null : fallback;
  },

  /**
   * Parse and normalize currency values
   */
  currency: (value: string, format: 'decimal' | 'cents' = 'decimal'): number | null => {
    if (!value || value.trim() === '') return null;

    let cleaned = value.trim();

    // Remove currency symbols and formatting
    cleaned = cleaned.replace(/[$,\s]/g, '');

    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    // If format is cents, convert to dollars
    if (format === 'cents') {
      return num / 100;
    }

    return Math.round(num * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Convert to uppercase
   */
  uppercase: (value: string): string => {
    return value ? value.trim().toUpperCase() : '';
  },

  /**
   * Convert to lowercase
   */
  lowercase: (value: string): string => {
    return value ? value.trim().toLowerCase() : '';
  },

  /**
   * Normalize state names to two-letter codes
   */
  state_code: (value: string): string => {
    if (!value || value.trim() === '') return '';

    const cleaned = value.trim().toLowerCase();

    // If already a 2-letter code, uppercase it
    if (cleaned.length === 2) {
      return cleaned.toUpperCase();
    }

    // Look up state name
    return STATE_CODES[cleaned] || value.trim().toUpperCase();
  },

  /**
   * Normalize encounter types
   */
  encounter_type: (value: string): string => {
    if (!value || value.trim() === '') return '';

    const cleaned = value.trim().toLowerCase();
    return ENCOUNTER_TYPES[cleaned] || value.trim();
  },
};

/**
 * Apply a single column mapping to a value
 */
export function applyTransform(
  value: string,
  mapping: ColumnMapping,
  options?: { dateFormat?: string; currencyFormat?: 'decimal' | 'cents' }
): any {
  // Handle empty values
  if (value === undefined || value === null || value.trim() === '') {
    return mapping.defaultValue !== undefined ? mapping.defaultValue : null;
  }

  // Apply transformation
  if (mapping.transform) {
    switch (mapping.transform) {
      case 'date':
        return transforms.date(value, options?.dateFormat);
      case 'currency':
        return transforms.currency(value, options?.currencyFormat);
      case 'uppercase':
        return transforms.uppercase(value);
      case 'lowercase':
        return transforms.lowercase(value);
      case 'state_code':
        return transforms.state_code(value);
      case 'encounter_type':
        return transforms.encounter_type(value);
      case 'custom':
        if (mapping.customTransform) {
          return mapping.customTransform(value);
        }
        return value.trim();
      default:
        return value.trim();
    }
  }

  return value.trim();
}

/**
 * Apply all mappings to a row of data
 */
export function applyMappings(
  row: Record<string, string>,
  mappings: ColumnMapping[],
  options?: { dateFormat?: string; currencyFormat?: 'decimal' | 'cents' }
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    const sourceValue = row[mapping.sourceColumn];
    result[mapping.targetField] = applyTransform(sourceValue, mapping, options);
  }

  return result;
}

/**
 * Validate a row against required field mappings
 */
export function validateRow(
  row: Record<string, any>,
  mappings: ColumnMapping[],
  rowNumber: number
): ImportError[] {
  const errors: ImportError[] = [];

  for (const mapping of mappings) {
    if (mapping.required) {
      const value = row[mapping.targetField];

      if (value === null || value === undefined || value === '') {
        errors.push({
          row: rowNumber,
          column: mapping.targetField,
          value: String(row[mapping.sourceColumn] || ''),
          message: `Required field "${mapping.targetField}" is missing or empty`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate a transformed value against expected type
 */
export function validateTransformedValue(
  value: any,
  mapping: ColumnMapping,
  rowNumber: number
): ImportError | null {
  if (value === null && !mapping.required) {
    return null; // Optional field with no value is OK
  }

  if (mapping.transform === 'date' && value !== null) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      return {
        row: rowNumber,
        column: mapping.targetField,
        value: String(value),
        message: `Invalid date value for "${mapping.targetField}"`,
        severity: 'warning',
      };
    }
  }

  if (mapping.transform === 'currency' && value !== null) {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        row: rowNumber,
        column: mapping.targetField,
        value: String(value),
        message: `Invalid currency value for "${mapping.targetField}"`,
        severity: 'warning',
      };
    }
  }

  return null;
}

/**
 * Auto-detect column mappings based on column names
 */
export function detectColumnMappings(
  columns: string[],
  existingMappings?: ColumnMapping[]
): ColumnDetectionResult[] {
  const results: ColumnDetectionResult[] = [];
  const usedTargets = new Set(existingMappings?.map((m) => m.targetField) || []);

  for (const column of columns) {
    let bestMatch: ColumnDetectionResult | null = null;

    for (const pattern of COLUMN_PATTERNS) {
      if (pattern.pattern.test(column)) {
        // Skip if this target is already used
        if (usedTargets.has(pattern.targetField)) continue;

        if (!bestMatch || pattern.confidence > bestMatch.confidence) {
          bestMatch = {
            sourceColumn: column,
            suggestedTarget: pattern.targetField,
            confidence: pattern.confidence,
            suggestedTransform: pattern.defaultTransform,
            sampleValues: [],
          };
        }
      }
    }

    if (bestMatch) {
      usedTargets.add(bestMatch.suggestedTarget);
      results.push(bestMatch);
    } else {
      // No match found, suggest as unmapped
      results.push({
        sourceColumn: column,
        suggestedTarget: '' as StandardField,
        confidence: 0,
        sampleValues: [],
      });
    }
  }

  return results;
}

/**
 * Add sample values to detection results
 */
export function addSampleValues(
  detectionResults: ColumnDetectionResult[],
  rows: Record<string, string>[],
  maxSamples: number = 3
): ColumnDetectionResult[] {
  return detectionResults.map((result) => {
    const samples: string[] = [];

    for (const row of rows) {
      const value = row[result.sourceColumn];
      if (value && value.trim() !== '' && !samples.includes(value.trim())) {
        samples.push(value.trim());
        if (samples.length >= maxSamples) break;
      }
    }

    return {
      ...result,
      sampleValues: samples,
    };
  });
}

/**
 * Create column mappings from detection results
 */
export function createMappingsFromDetection(
  detectionResults: ColumnDetectionResult[],
  requiredFields: StandardField[] = ['accountNumber']
): ColumnMapping[] {
  return detectionResults
    .filter((result) => result.suggestedTarget && result.confidence > 0)
    .map((result) => ({
      sourceColumn: result.sourceColumn,
      targetField: result.suggestedTarget,
      transform: result.suggestedTransform,
      required: requiredFields.includes(result.suggestedTarget as StandardField),
    }));
}

/**
 * Merge custom mappings with preset mappings
 */
export function mergeMappings(
  presetMappings: ColumnMapping[],
  customMappings: ColumnMapping[]
): ColumnMapping[] {
  const merged = new Map<string, ColumnMapping>();

  // Add preset mappings first
  for (const mapping of presetMappings) {
    merged.set(mapping.targetField, mapping);
  }

  // Override with custom mappings
  for (const mapping of customMappings) {
    merged.set(mapping.targetField, mapping);
  }

  return Array.from(merged.values());
}

/**
 * Get a list of unmapped source columns
 */
export function getUnmappedColumns(
  columns: string[],
  mappings: ColumnMapping[]
): string[] {
  const mappedSources = new Set(mappings.map((m) => m.sourceColumn));
  return columns.filter((col) => !mappedSources.has(col));
}

/**
 * Validate that all required mappings have source columns that exist
 */
export function validateMappings(
  columns: string[],
  mappings: ColumnMapping[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const columnSet = new Set(columns);

  for (const mapping of mappings) {
    if (!columnSet.has(mapping.sourceColumn)) {
      if (mapping.required) {
        errors.push(
          `Required mapping "${mapping.targetField}" references missing column "${mapping.sourceColumn}"`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
