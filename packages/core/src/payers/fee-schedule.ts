/**
 * Fee Schedule Engine
 *
 * Manages fee schedules for payers, including fee lookup, expected payment
 * calculations, Medicare benchmarking, and bulk import functionality.
 *
 * Features:
 * - Fee schedule entry management
 * - Fee lookup by CPT code and date of service
 * - Expected payment calculation for claims
 * - Medicare benchmark comparisons
 * - Bulk fee schedule import
 */

import { getPayer, type Payer } from './payer-database.js';

// ============================================================================
// TYPES
// ============================================================================

export interface FeeScheduleEntry {
  /** Unique identifier */
  id?: string;
  /** Contract or payer ID this fee schedule belongs to */
  contractId?: string;
  /** Payer ID */
  payerId: string;
  /** CPT/HCPCS code */
  cptCode: string;
  /** Procedure description (optional) */
  description?: string;
  /** Modifier (if applicable) */
  modifier?: string;
  /** Place of service code (if rate varies by POS) */
  placeOfService?: string;
  /** Allowed/contracted amount */
  allowedAmount: number;
  /** Non-facility rate (for professional services) */
  nonFacilityRate?: number;
  /** Facility rate (for professional services) */
  facilityRate?: number;
  /** Relative Value Units (if applicable) */
  rvu?: number;
  /** Conversion factor used */
  conversionFactor?: number;
  /** Effective date of this fee */
  effectiveDate: Date;
  /** Termination date of this fee */
  terminationDate?: Date;
  /** Geographic region (for regional fee schedules) */
  region?: string;
  /** Whether this is the global fee (not split professional/technical) */
  isGlobal?: boolean;
  /** Created timestamp */
  createdAt?: Date;
  /** Updated timestamp */
  updatedAt?: Date;
}

export interface ClaimCharge {
  /** CPT/HCPCS code */
  cptCode: string;
  /** Modifier(s) */
  modifiers?: string[];
  /** Billed amount */
  billedAmount: number;
  /** Units */
  units: number;
  /** Date of service */
  dateOfService: Date;
  /** Place of service */
  placeOfService?: string;
}

export interface ExpectedPaymentResult {
  /** Total expected payment */
  totalExpectedPayment: number;
  /** Line-by-line breakdown */
  lineItems: ExpectedPaymentLineItem[];
  /** Payer information */
  payerName?: string;
  /** Payment methodology notes */
  notes: string[];
}

export interface ExpectedPaymentLineItem {
  /** CPT code */
  cptCode: string;
  /** Modifier */
  modifier?: string;
  /** Billed amount */
  billedAmount: number;
  /** Allowed amount per unit */
  allowedAmount: number;
  /** Units */
  units: number;
  /** Expected payment for this line */
  expectedPayment: number;
  /** Whether fee was found in schedule */
  feeFound: boolean;
  /** Calculation notes */
  notes?: string;
}

export interface MedicareBenchmark {
  /** CPT code */
  cptCode: string;
  /** Medicare allowed amount */
  medicareAllowedAmount: number;
  /** Payer allowed amount */
  payerAllowedAmount: number;
  /** Percentage of Medicare */
  percentOfMedicare: number;
  /** Dollar variance from Medicare */
  variance: number;
  /** Whether payer pays above/below/at Medicare rate */
  comparison: 'above' | 'below' | 'at';
}

export interface FeeScheduleImportResult {
  /** Number of entries imported */
  importedCount: number;
  /** Number of entries updated */
  updatedCount: number;
  /** Number of entries skipped */
  skippedCount: number;
  /** Errors encountered */
  errors: FeeScheduleImportError[];
  /** Import summary */
  summary: string;
}

export interface FeeScheduleImportError {
  /** Row number in source file */
  row: number;
  /** CPT code (if available) */
  cptCode?: string;
  /** Error message */
  message: string;
}

export interface FeeScheduleCSVRow {
  /** CPT/HCPCS code column */
  cptCode: string;
  /** Description column */
  description?: string;
  /** Modifier column */
  modifier?: string;
  /** Allowed amount column */
  allowedAmount: string;
  /** Non-facility rate column */
  nonFacilityRate?: string;
  /** Facility rate column */
  facilityRate?: string;
  /** Effective date column */
  effectiveDate?: string;
  /** Termination date column */
  terminationDate?: string;
  /** RVU column */
  rvu?: string;
  /** Place of service column */
  placeOfService?: string;
}

// ============================================================================
// IN-MEMORY FEE SCHEDULE STORAGE
// ============================================================================

/**
 * In-memory storage for fee schedules
 * Key: payerId:cptCode:modifier
 */
const feeScheduleStore: Map<string, FeeScheduleEntry[]> = new Map();

/**
 * Medicare Fee Schedule (2024 values for common codes)
 * Used as benchmark for comparisons
 */
const MEDICARE_FEE_SCHEDULE: Record<string, number> = {
  // E/M Office Visits
  '99213': 92.80,    // Office visit, established, level 3
  '99214': 130.52,   // Office visit, established, level 4
  '99215': 175.00,   // Office visit, established, level 5
  '99203': 110.40,   // Office visit, new, level 3
  '99204': 169.33,   // Office visit, new, level 4
  '99205': 211.84,   // Office visit, new, level 5

  // Hospital E/M
  '99221': 139.00,   // Initial hospital care, level 1
  '99222': 196.00,   // Initial hospital care, level 2
  '99223': 283.00,   // Initial hospital care, level 3
  '99231': 51.00,    // Subsequent hospital care, level 1
  '99232': 92.00,    // Subsequent hospital care, level 2
  '99233': 133.00,   // Subsequent hospital care, level 3

  // ED Visits
  '99281': 26.00,    // ED visit, level 1
  '99282': 49.00,    // ED visit, level 2
  '99283': 82.00,    // ED visit, level 3
  '99284': 147.00,   // ED visit, level 4
  '99285': 229.00,   // ED visit, level 5

  // Common Procedures
  '10060': 156.00,   // Incision and drainage, simple
  '10061': 302.00,   // Incision and drainage, complicated
  '11042': 63.00,    // Debridement, skin and subcutaneous
  '12001': 174.00,   // Simple repair, 2.5cm or less
  '12002': 197.00,   // Simple repair, 2.6-7.5cm

  // Imaging
  '71046': 26.00,    // Chest x-ray, 2 views
  '71047': 31.00,    // Chest x-ray, 3 views
  '73560': 25.00,    // X-ray knee, 1-2 views
  '73610': 25.00,    // X-ray ankle, 3 views
  '70553': 310.00,   // MRI brain with/without contrast
  '72148': 215.00,   // MRI lumbar spine
  '74177': 380.00,   // CT abdomen/pelvis with contrast

  // Lab (professional component)
  '85025': 7.77,     // CBC with differential
  '80053': 10.56,    // Comprehensive metabolic panel
  '80048': 9.05,     // Basic metabolic panel
  '84443': 15.21,    // TSH
  '85610': 4.34,     // PT

  // Common outpatient procedures
  '43239': 303.00,   // EGD with biopsy
  '45380': 290.00,   // Colonoscopy with biopsy
  '47562': 450.00,   // Laparoscopic cholecystectomy
  '27447': 1350.00,  // Total knee replacement
  '27130': 1425.00,  // Total hip replacement

  // Anesthesia (base units, conversion factor ~$22)
  '00100': 110.00,   // Anesthesia for salivary gland
  '00300': 132.00,   // Anesthesia for head
  '00400': 88.00,    // Anesthesia for extremity

  // Physical Therapy
  '97110': 32.00,    // Therapeutic exercises
  '97140': 29.00,    // Manual therapy
  '97530': 36.00,    // Therapeutic activities
  '97542': 17.00,    // Wheelchair management
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate storage key for fee schedule entry
 */
function generateFeeKey(payerId: string, cptCode: string, modifier?: string): string {
  return `${payerId}:${cptCode}:${modifier || 'none'}`;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Parse numeric string to number
 */
function parseAmount(amountStr: string | undefined): number | undefined {
  if (!amountStr) return undefined;
  const cleaned = amountStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Check if date falls within fee schedule effective period
 */
function isDateInRange(dateOfService: Date, entry: FeeScheduleEntry): boolean {
  const dos = dateOfService.getTime();
  const effectiveStart = entry.effectiveDate.getTime();
  const effectiveEnd = entry.terminationDate?.getTime() ?? Infinity;
  return dos >= effectiveStart && dos <= effectiveEnd;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Add a fee schedule entry to the store
 */
export function addFeeScheduleEntry(entry: FeeScheduleEntry): void {
  const key = generateFeeKey(entry.payerId, entry.cptCode, entry.modifier);
  const existing = feeScheduleStore.get(key) || [];
  existing.push({
    ...entry,
    createdAt: entry.createdAt || new Date(),
    updatedAt: entry.updatedAt || new Date()
  });
  feeScheduleStore.set(key, existing);
}

/**
 * Lookup fee for a specific payer, CPT code, and date of service
 */
export function lookupFee(
  payerId: string,
  cptCode: string,
  dateOfService: Date,
  options?: {
    modifier?: string;
    placeOfService?: string;
    useFacilityRate?: boolean;
  }
): FeeScheduleEntry | undefined {
  const key = generateFeeKey(payerId, cptCode, options?.modifier);
  const entries = feeScheduleStore.get(key);

  if (!entries || entries.length === 0) {
    // Try without modifier if not found
    if (options?.modifier) {
      const keyNoMod = generateFeeKey(payerId, cptCode);
      const entriesNoMod = feeScheduleStore.get(keyNoMod);
      if (entriesNoMod) {
        return entriesNoMod.find(entry => isDateInRange(dateOfService, entry));
      }
    }
    return undefined;
  }

  // Find entry effective on the date of service
  const matchingEntry = entries.find(entry => isDateInRange(dateOfService, entry));

  if (matchingEntry && options?.useFacilityRate && matchingEntry.facilityRate !== undefined) {
    return {
      ...matchingEntry,
      allowedAmount: matchingEntry.facilityRate
    };
  }

  return matchingEntry;
}

/**
 * Get Medicare allowed amount for a CPT code
 */
export function getMedicareAllowedAmount(cptCode: string): number | undefined {
  return MEDICARE_FEE_SCHEDULE[cptCode];
}

/**
 * Calculate expected payment for a claim
 */
export function calculateExpectedPayment(
  payerId: string,
  charges: ClaimCharge[]
): ExpectedPaymentResult {
  const payer = getPayer(payerId);
  const lineItems: ExpectedPaymentLineItem[] = [];
  const notes: string[] = [];
  let totalExpectedPayment = 0;

  for (const charge of charges) {
    const feeEntry = lookupFee(payerId, charge.cptCode, charge.dateOfService, {
      modifier: charge.modifiers?.[0],
      placeOfService: charge.placeOfService
    });

    let allowedAmount: number;
    let feeFound: boolean;
    let lineNotes: string | undefined;

    if (feeEntry) {
      allowedAmount = feeEntry.allowedAmount;
      feeFound = true;
    } else {
      // Fall back to Medicare rate if available
      const medicareAmount = getMedicareAllowedAmount(charge.cptCode);
      if (medicareAmount) {
        allowedAmount = medicareAmount;
        feeFound = false;
        lineNotes = 'Fee not found in contract; using Medicare rate as estimate';
        notes.push(`CPT ${charge.cptCode}: Using Medicare rate as estimate`);
      } else {
        // Use a percentage of billed as last resort
        allowedAmount = charge.billedAmount * 0.40;
        feeFound = false;
        lineNotes = 'Fee not found; estimating at 40% of billed';
        notes.push(`CPT ${charge.cptCode}: Estimating at 40% of billed amount`);
      }
    }

    const expectedPayment = allowedAmount * charge.units;
    totalExpectedPayment += expectedPayment;

    lineItems.push({
      cptCode: charge.cptCode,
      modifier: charge.modifiers?.[0],
      billedAmount: charge.billedAmount,
      allowedAmount,
      units: charge.units,
      expectedPayment,
      feeFound,
      notes: lineNotes
    });
  }

  return {
    totalExpectedPayment: Math.round(totalExpectedPayment * 100) / 100,
    lineItems,
    payerName: payer?.name,
    notes
  };
}

/**
 * Compare payer rates to Medicare benchmark
 */
export function compareToMedicare(
  payerId: string,
  cptCodes: string[],
  dateOfService?: Date
): MedicareBenchmark[] {
  const dos = dateOfService || new Date();
  const benchmarks: MedicareBenchmark[] = [];

  for (const cptCode of cptCodes) {
    const medicareAmount = getMedicareAllowedAmount(cptCode);
    if (!medicareAmount) continue;

    const feeEntry = lookupFee(payerId, cptCode, dos);
    const payerAmount = feeEntry?.allowedAmount ?? 0;

    const variance = payerAmount - medicareAmount;
    const percentOfMedicare = medicareAmount > 0
      ? Math.round((payerAmount / medicareAmount) * 100)
      : 0;

    let comparison: 'above' | 'below' | 'at';
    if (Math.abs(variance) < 0.01) {
      comparison = 'at';
    } else if (variance > 0) {
      comparison = 'above';
    } else {
      comparison = 'below';
    }

    benchmarks.push({
      cptCode,
      medicareAllowedAmount: medicareAmount,
      payerAllowedAmount: payerAmount,
      percentOfMedicare,
      variance: Math.round(variance * 100) / 100,
      comparison
    });
  }

  return benchmarks;
}

/**
 * Calculate average percent of Medicare for a payer
 */
export function calculateAveragePercentOfMedicare(
  payerId: string,
  dateOfService?: Date
): {
  averagePercent: number;
  codesAnalyzed: number;
  codesAboveMedicare: number;
  codesBelowMedicare: number;
  codesAtMedicare: number;
} {
  const cptCodes = Object.keys(MEDICARE_FEE_SCHEDULE);
  const benchmarks = compareToMedicare(payerId, cptCodes, dateOfService);

  if (benchmarks.length === 0) {
    return {
      averagePercent: 0,
      codesAnalyzed: 0,
      codesAboveMedicare: 0,
      codesBelowMedicare: 0,
      codesAtMedicare: 0
    };
  }

  const totalPercent = benchmarks.reduce((sum, b) => sum + b.percentOfMedicare, 0);
  const codesAbove = benchmarks.filter(b => b.comparison === 'above').length;
  const codesBelow = benchmarks.filter(b => b.comparison === 'below').length;
  const codesAt = benchmarks.filter(b => b.comparison === 'at').length;

  return {
    averagePercent: Math.round(totalPercent / benchmarks.length),
    codesAnalyzed: benchmarks.length,
    codesAboveMedicare: codesAbove,
    codesBelowMedicare: codesBelow,
    codesAtMedicare: codesAt
  };
}

/**
 * Import fee schedule from CSV data
 */
export function importFeeSchedule(
  payerId: string,
  csvData: FeeScheduleCSVRow[],
  options?: {
    contractId?: string;
    defaultEffectiveDate?: Date;
    updateExisting?: boolean;
  }
): FeeScheduleImportResult {
  const result: FeeScheduleImportResult = {
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
    summary: ''
  };

  const defaultEffective = options?.defaultEffectiveDate || new Date();

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNum = i + 1;

    try {
      // Validate required fields
      if (!row?.cptCode) {
        result.errors.push({
          row: rowNum,
          message: 'Missing CPT code'
        });
        result.skippedCount++;
        continue;
      }

      const allowedAmount = parseAmount(row.allowedAmount);
      if (allowedAmount === undefined || allowedAmount < 0) {
        result.errors.push({
          row: rowNum,
          cptCode: row.cptCode,
          message: 'Invalid or missing allowed amount'
        });
        result.skippedCount++;
        continue;
      }

      // Create fee schedule entry
      const entry: FeeScheduleEntry = {
        payerId,
        contractId: options?.contractId,
        cptCode: row.cptCode.trim(),
        description: row.description?.trim(),
        modifier: row.modifier?.trim() || undefined,
        allowedAmount,
        nonFacilityRate: parseAmount(row.nonFacilityRate),
        facilityRate: parseAmount(row.facilityRate),
        effectiveDate: parseDate(row.effectiveDate) || defaultEffective,
        terminationDate: parseDate(row.terminationDate),
        rvu: row.rvu ? parseFloat(row.rvu) : undefined,
        placeOfService: row.placeOfService?.trim()
      };

      // Check for existing entry
      const key = generateFeeKey(payerId, entry.cptCode, entry.modifier);
      const existing = feeScheduleStore.get(key);

      if (existing && existing.length > 0 && options?.updateExisting) {
        // Update existing
        const lastEntry = existing[existing.length - 1];
        if (lastEntry) {
          lastEntry.allowedAmount = entry.allowedAmount;
          lastEntry.nonFacilityRate = entry.nonFacilityRate;
          lastEntry.facilityRate = entry.facilityRate;
          lastEntry.updatedAt = new Date();
          result.updatedCount++;
        }
      } else {
        // Add new entry
        addFeeScheduleEntry(entry);
        result.importedCount++;
      }
    } catch (error) {
      result.errors.push({
        row: rowNum,
        cptCode: row?.cptCode,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      result.skippedCount++;
    }
  }

  result.summary = `Imported ${result.importedCount} entries, updated ${result.updatedCount}, skipped ${result.skippedCount} with ${result.errors.length} errors`;

  return result;
}

/**
 * Get all fee schedule entries for a payer
 */
export function getFeeScheduleForPayer(payerId: string): FeeScheduleEntry[] {
  const entries: FeeScheduleEntry[] = [];

  for (const [key, scheduleEntries] of feeScheduleStore.entries()) {
    if (key.startsWith(`${payerId}:`)) {
      entries.push(...scheduleEntries);
    }
  }

  return entries.sort((a, b) => a.cptCode.localeCompare(b.cptCode));
}

/**
 * Clear fee schedule for a payer
 */
export function clearFeeSchedule(payerId: string): number {
  let cleared = 0;

  for (const key of feeScheduleStore.keys()) {
    if (key.startsWith(`${payerId}:`)) {
      feeScheduleStore.delete(key);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Get fee schedule statistics for a payer
 */
export function getFeeScheduleStats(payerId: string): {
  totalEntries: number;
  uniqueCptCodes: number;
  averageAllowedAmount: number;
  minAllowedAmount: number;
  maxAllowedAmount: number;
} {
  const entries = getFeeScheduleForPayer(payerId);

  if (entries.length === 0) {
    return {
      totalEntries: 0,
      uniqueCptCodes: 0,
      averageAllowedAmount: 0,
      minAllowedAmount: 0,
      maxAllowedAmount: 0
    };
  }

  const uniqueCodes = new Set(entries.map(e => e.cptCode));
  const amounts = entries.map(e => e.allowedAmount);
  const total = amounts.reduce((sum, amt) => sum + amt, 0);

  return {
    totalEntries: entries.length,
    uniqueCptCodes: uniqueCodes.size,
    averageAllowedAmount: Math.round((total / entries.length) * 100) / 100,
    minAllowedAmount: Math.min(...amounts),
    maxAllowedAmount: Math.max(...amounts)
  };
}

/**
 * Export fee schedule to array format
 */
export function exportFeeSchedule(payerId: string): FeeScheduleEntry[] {
  return getFeeScheduleForPayer(payerId);
}
